// Business logic for customers. Controllers stay thin: they read the request and
// call these functions. Nothing here knows about Express.
import prisma from "../../lib/prisma.js";
import { AppError, notFound } from "../../utils/appError.js";
import { createWithSequentialId } from "../../utils/sequentialId.js";
import { paginated, readPagination } from "../../utils/pagination.js";
import { buildCustomerRowStats, buildCustomerStats } from "./customer.analytics.js";

const ID_OPTIONS = { model: "customer", field: "customerId", prefix: "C", width: 3 };

// Only the order fields the table-row statistics need.
const ROW_ORDER_SELECT = { select: { status: true, orderDate: true } };

// Partial, case-insensitive search across the four things an employee might have
// in front of them: a name, a customer ID, a phone number or an email.
const buildSearchFilter = (search) => {
  if (!search) return {};
  return {
    OR: [
      { fullName: { contains: search, mode: "insensitive" } },
      { customerId: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ],
  };
};

const buildCreatedAtFilter = (from, to) => {
  if (!from && !to) return {};
  const createdAt = {};
  if (from) createdAt.gte = new Date(from);
  if (to) {
    // A date-only "to" should include the whole day.
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    createdAt.lte = end;
  }
  return { createdAt };
};

/**
 * The customers table. Database-level filters (search, city, source, dates) run
 * in Postgres; the derived status filter and the order-count sort run in JS,
 * because customer status is calculated from orders rather than stored. For a
 * business with a few thousand customers this is fast and keeps the code honest.
 */
export const listCustomers = async (query) => {
  const pagination = readPagination(query);

  const where = {
    ...buildSearchFilter(query.search),
    ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
    ...(query.source ? { source: query.source } : {}),
    ...buildCreatedAtFilter(query.createdFrom, query.createdTo),
  };

  const customers = await prisma.customer.findMany({
    where,
    include: { orders: ROW_ORDER_SELECT },
  });

  let rows = customers.map(({ orders, ...customer }) => ({
    ...customer,
    ...buildCustomerRowStats(orders),
  }));

  if (query.status && query.status !== "ALL") {
    rows = rows.filter((row) => row.status === query.status);
  }

  rows.sort((a, b) => {
    switch (query.sort) {
      case "name":
        return a.fullName.localeCompare(b.fullName);
      case "orders":
        return b.totalOrders - a.totalOrders;
      case "lastOrder":
        return new Date(b.lastOrderDate ?? 0) - new Date(a.lastOrderDate ?? 0);
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  const total = rows.length;
  const page = rows.slice(pagination.skip, pagination.skip + pagination.take);

  return paginated(page, total, pagination);
};

/**
 * The Customer 360 view: the customer record, their complete order history and
 * the calculated behaviour statistics in one response, so the profile page never
 * has to stitch several requests together.
 */
export const getCustomerProfile = async (customerId) => {
  const customer = await prisma.customer.findUnique({
    where: { customerId },
    include: {
      orders: {
        orderBy: { orderDate: "desc" },
        include: { product: { select: { productId: true, name: true, active: true } } },
      },
    },
  });

  if (!customer) throw notFound("العميل");

  const { orders, ...details } = customer;

  return {
    customer: details,
    orders,
    stats: buildCustomerStats(orders),
  };
};

export const createCustomer = async (data) =>
  createWithSequentialId(prisma, ID_OPTIONS, (customerId) =>
    prisma.customer.create({ data: { ...data, customerId } }),
  );

export const updateCustomer = async (customerId, data) => {
  const exists = await prisma.customer.findUnique({
    where: { customerId },
    select: { id: true },
  });
  if (!exists) throw notFound("العميل");

  // customerId is never part of `data` (see updateCustomerSchema): the whole
  // order history hangs off it, so it must not change.
  return prisma.customer.update({ where: { customerId }, data });
};

export const deleteCustomer = async (customerId) => {
  const customer = await prisma.customer.findUnique({
    where: { customerId },
    select: { id: true, _count: { select: { orders: true } } },
  });
  if (!customer) throw notFound("العميل");

  // Deleting cascades to their orders (see schema.prisma). The UI warns about
  // this in the confirmation dialog, and we report how much history went along.
  await prisma.customer.delete({ where: { customerId } });

  return { customerId, deletedOrders: customer._count.orders };
};

// Values that actually exist in the data, used to fill the filter dropdowns.
// Better than a hardcoded city list that goes stale.
export const getCustomerFilterOptions = async () => {
  const [cities, sources] = await Promise.all([
    prisma.customer.findMany({
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    }),
    prisma.customer.findMany({
      distinct: ["source"],
      select: { source: true },
      orderBy: { source: "asc" },
    }),
  ]);

  return {
    cities: cities.map((row) => row.city),
    sources: sources.map((row) => row.source),
  };
};

// Used by the customer picker on the "Add order" form.
export const searchCustomersForPicker = async (search) => {
  if (search && search.length > 120) throw new AppError("نص البحث طويل جدًا", 422);

  return prisma.customer.findMany({
    where: buildSearchFilter(search),
    select: { customerId: true, fullName: true, phone: true, city: true },
    orderBy: { fullName: "asc" },
    take: 25,
  });
};
