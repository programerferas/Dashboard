// The product catalogue. Deliberately simple: it exists so orders can reference a
// product instead of retyping its name and category every time.
import prisma from "../../lib/prisma.js";
import { notFound } from "../../utils/appError.js";
import { createWithSequentialId } from "../../utils/sequentialId.js";
import { paginated, readPagination } from "../../utils/pagination.js";

const ID_OPTIONS = { model: "product", field: "productId", prefix: "P", width: 3 };

export const listProducts = async (query) => {
  const pagination = readPagination(query);

  const where = {
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { productId: { contains: query.search, mode: "insensitive" } },
            { category: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.category ? { category: { equals: query.category, mode: "insensitive" } } : {}),
    ...(query.active === "TRUE" ? { active: true } : {}),
    ...(query.active === "FALSE" ? { active: false } : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      // How often a product has been ordered is the most useful thing to show on
      // this page, and the count comes straight from the relation.
      include: { _count: { select: { orders: true } } },
      orderBy: { productId: "asc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.product.count({ where }),
  ]);

  const items = products.map(({ _count, ...product }) => ({
    ...product,
    orderCount: _count.orders,
  }));

  return paginated(items, total, pagination);
};

// Used by the product picker on the order form: active products only.
export const listActiveProducts = async () =>
  prisma.product.findMany({
    where: { active: true },
    select: { productId: true, name: true, category: true, occasion: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

export const getProduct = async (productId) => {
  const product = await prisma.product.findUnique({
    where: { productId },
    include: { _count: { select: { orders: true } } },
  });
  if (!product) throw notFound("المنتج");

  const { _count, ...rest } = product;
  return { ...rest, orderCount: _count.orders };
};

export const createProduct = async (data) =>
  createWithSequentialId(prisma, ID_OPTIONS, (productId) =>
    prisma.product.create({ data: { ...data, productId } }),
  );

export const updateProduct = async (productId, data) => {
  const exists = await prisma.product.findUnique({
    where: { productId },
    select: { id: true },
  });
  if (!exists) throw notFound("المنتج");

  return prisma.product.update({ where: { productId }, data });
};

export const deleteProduct = async (productId) => {
  const exists = await prisma.product.findUnique({
    where: { productId },
    select: { id: true },
  });
  if (!exists) throw notFound("المنتج");

  // Past orders keep their productName and category, and their productId link is
  // set to NULL (see schema.prisma), so deleting a product never rewrites history.
  await prisma.product.delete({ where: { productId } });
  return { productId };
};

// Which products and categories actually sell.
//
// The grouping and counting is done by the database, over every order in the shop.
// The ranking is then done here: a shop has tens of products and a handful of
// categories, so sorting that short list in JS is instant and keeps the query
// simple. Cancelled orders are excluded — they were never sold.
export const getProductPerformance = async (limit = 10) => {
  const [byProduct, byCategory] = await Promise.all([
    prisma.order.groupBy({
      by: ["productName"],
      where: { status: { not: "CANCELLED" } },
      _count: { _all: true },
      _sum: { quantity: true },
    }),
    prisma.order.groupBy({
      by: ["category"],
      where: { status: { not: "CANCELLED" } },
      _count: { _all: true },
      _sum: { quantity: true },
    }),
  ]);

  const rank = (rows, key) =>
    rows
      .map((row) => ({
        name: row[key],
        orders: row._count._all,
        quantity: row._sum.quantity ?? 0,
      }))
      .sort((a, b) => b.orders - a.orders || b.quantity - a.quantity)
      .slice(0, limit);

  return {
    topProducts: rank(byProduct, "productName"),
    topCategories: rank(byCategory, "category"),
  };
};
