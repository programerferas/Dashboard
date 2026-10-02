// Business logic for orders. An order always belongs to exactly one customer,
// and that link is the customerId ("C001").
import prisma from "../../lib/prisma.js";
import { AppError, notFound } from "../../utils/appError.js";
import { createWithSequentialId } from "../../utils/sequentialId.js";
import { paginated, readPagination } from "../../utils/pagination.js";
import { createCustomer } from "../customer/customer.service.js";
import { sendOrderNotification } from "../notification/whatsapp.service.js";

const ID_OPTIONS = { model: "order", field: "orderId", prefix: "O", width: 3 };

// Orders are almost always read together with who they belong to, so the
// customer's name and phone are included for the table.
const ORDER_INCLUDE = {
  customer: { select: { customerId: true, fullName: true, phone: true, city: true } },
  product: { select: { productId: true, name: true, active: true } },
};

const buildSearchFilter = (search) => {
  if (!search) return {};
  return {
    OR: [
      { orderId: { contains: search, mode: "insensitive" } },
      { customerId: { contains: search, mode: "insensitive" } },
      { productName: { contains: search, mode: "insensitive" } },
      { customer: { fullName: { contains: search, mode: "insensitive" } } },
      { customer: { phone: { contains: search } } },
    ],
  };
};

const buildDateFilter = (from, to) => {
  if (!from && !to) return {};
  const orderDate = {};
  if (from) orderDate.gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    orderDate.lte = end;
  }
  return { orderDate };
};

const buildOrderBy = (sort) => {
  switch (sort) {
    case "oldest":
      return [{ orderDate: "asc" }];
    case "quantity":
      return [{ quantity: "desc" }];
    default:
      return [{ orderDate: "desc" }, { id: "desc" }];
  }
};

export const listOrders = async (query) => {
  const pagination = readPagination(query);

  const where = {
    ...buildSearchFilter(query.search),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.category ? { category: { equals: query.category, mode: "insensitive" } } : {}),
    ...(query.occasion ? { occasion: { equals: query.occasion, mode: "insensitive" } } : {}),
    ...(query.status && query.status !== "ALL" ? { status: query.status } : {}),
    ...buildDateFilter(query.dateFrom, query.dateTo),
  };

  // Orders need no derived fields, so the database does the whole job here:
  // filtering, sorting and paging.
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: ORDER_INCLUDE,
      orderBy: buildOrderBy(query.sort),
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.order.count({ where }),
  ]);

  return paginated(orders, total, pagination);
};

export const getOrder = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { orderId },
    include: ORDER_INCLUDE,
  });
  if (!order) throw notFound("الطلب");
  return order;
};

/**
 * Resolves what was actually sold.
 *
 * When the order references a catalogue product, the product supplies the name,
 * category and occasion, so nobody has to retype them and they cannot drift. The
 * values are still copied onto the order row: if the product is renamed or
 * retired next year, this order must keep showing what was sold today.
 */
const resolveProductFields = async (data, existing = null) => {
  // `undefined` means the caller did not mention the product, so keep what the
  // order already had. An explicit `null` means "no catalogue product", which is
  // how a saved order is switched to a custom job.
  const productId =
    data.productId !== undefined ? data.productId : existing?.productId ?? null;

  if (productId) {
    const product = await prisma.product.findUnique({ where: { productId } });
    if (!product) throw new AppError(`المنتج ${productId} غير موجود`, 400);

    return {
      productId,
      productName: data.productName ?? product.name,
      category: data.category ?? product.category,
      occasion: data.occasion ?? product.occasion ?? existing?.occasion ?? null,
    };
  }

  // No catalogue product: the order describes a one-off custom job, so the name
  // and category have to be typed in.
  const productName = data.productName ?? existing?.productName;
  const category = data.category ?? existing?.category;

  if (!productName) throw new AppError("اختر منتجًا أو اكتب اسم المنتج", 422);
  if (!category) throw new AppError("الفئة مطلوبة عند عدم اختيار منتج", 422);

  return {
    productId: null,
    productName,
    category,
    occasion: data.occasion ?? existing?.occasion ?? null,
  };
};

const assertCustomerExists = async (customerId) => {
  const customer = await prisma.customer.findUnique({
    where: { customerId },
    select: { customerId: true },
  });
  if (!customer) throw new AppError(`العميل ${customerId} غير موجود`, 400);
};

export const createOrder = async ({ newCustomer, ...data }) => {
  // The product is checked first, so an invalid order never leaves a new
  // customer behind.
  const productFields = await resolveProductFields(data);

  let { customerId } = data;
  if (newCustomer) {
    ({ customerId } = await createCustomer(newCustomer));
  } else {
    await assertCustomerExists(customerId);
  }

  let order;
  try {
    order = await createWithSequentialId(prisma, ID_OPTIONS, (orderId) =>
      prisma.order.create({
        data: {
          orderId,
          customerId,
          orderDate: data.orderDate,
          quantity: data.quantity,
          status: data.status,
          notes: data.notes ?? null,
          ...productFields,
        },
        include: ORDER_INCLUDE,
      }),
    );
  } catch (error) {
    // The customer was created only for this order; do not keep them if the
    // order itself could not be saved.
    if (newCustomer) await prisma.customer.delete({ where: { customerId } }).catch(() => {});
    throw error;
  }

  // Only once the order is safely saved. Whatever WhatsApp answers, the order stays.
  return notifyAdmin(order);
};

// Sends the WhatsApp notice for a saved order and records the outcome on it.
const notifyAdmin = async (order) => {
  const { status, error } = await sendOrderNotification(order);

  try {
    return await prisma.order.update({
      where: { orderId: order.orderId },
      data: {
        whatsappStatus: status,
        whatsappError: error,
        ...(status === "SENT" ? { whatsappSentAt: new Date() } : {}),
      },
      include: ORDER_INCLUDE,
    });
  } catch (updateError) {
    // The order is saved; failing the request now would only invite a duplicate
    // "Add Order" click.
    console.error(`Could not record WhatsApp status for ${order.orderId}:`, updateError.message);
    return { ...order, whatsappStatus: status, whatsappError: error };
  }
};

// The "resend" button: for a message that failed, or an order created while
// WhatsApp was switched off.
export const resendOrderWhatsapp = async (orderId) => notifyAdmin(await getOrder(orderId));

export const updateOrder = async (orderId, data) => {
  const existing = await prisma.order.findUnique({ where: { orderId } });
  if (!existing) throw notFound("الطلب");

  if (data.customerId && data.customerId !== existing.customerId) {
    await assertCustomerExists(data.customerId);
  }

  // Only recompute the product fields when something about the product changed;
  // otherwise leave the historical values exactly as they are.
  const productTouched =
    data.productId !== undefined ||
    data.productName !== undefined ||
    data.category !== undefined ||
    data.occasion !== undefined;

  const productFields = productTouched ? await resolveProductFields(data, existing) : {};

  return prisma.order.update({
    where: { orderId },
    data: {
      ...(data.customerId ? { customerId: data.customerId } : {}),
      ...(data.orderDate ? { orderDate: data.orderDate } : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
      ...productFields,
    },
    include: ORDER_INCLUDE,
  });
};

export const deleteOrder = async (orderId) => {
  const existing = await prisma.order.findUnique({
    where: { orderId },
    select: { orderId: true, customerId: true },
  });
  if (!existing) throw notFound("الطلب");

  await prisma.order.delete({ where: { orderId } });
  return existing;
};

// Fills the filter dropdowns on the orders page from the values in use.
export const getOrderFilterOptions = async () => {
  const [categories, occasions] = await Promise.all([
    prisma.order.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.order.findMany({
      distinct: ["occasion"],
      select: { occasion: true },
      orderBy: { occasion: "asc" },
      where: { occasion: { not: null } },
    }),
  ]);

  return {
    categories: categories.map((row) => row.category),
    occasions: occasions.map((row) => row.occasion).filter(Boolean),
  };
};
