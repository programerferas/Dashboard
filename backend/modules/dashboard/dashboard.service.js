// The dashboard reads from the same tables as everything else and calculates its
// numbers on request. Nothing is cached and nothing is stored twice, so the
// figures always match what the customers and orders pages show.
//
// Note: there are no revenue figures anywhere on this dashboard, because the
// database holds no prices. Inventing them would be worse than leaving them out.
import prisma from "../../lib/prisma.js";
import { getProductPerformance } from "../product/product.service.js";

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const startOfThisMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

/**
 * New vs repeat across the whole customer base.
 *
 * One grouped query gives us how many (non-cancelled) orders each customer has;
 * the split is then just counting groups. This is the same rule the customer
 * profile uses: 1 order = new, more than 1 = repeat.
 */
const getCustomerBreakdown = async () => {
  const [totalCustomers, groups] = await Promise.all([
    prisma.customer.count(),
    prisma.order.groupBy({
      by: ["customerId"],
      where: { status: { not: "CANCELLED" } },
      _count: { _all: true },
    }),
  ]);

  const repeatCustomers = groups.filter((group) => group._count._all > 1).length;
  const newCustomers = groups.filter((group) => group._count._all === 1).length;
  const withoutOrders = totalCustomers - groups.length;

  // Share of buying customers who came back. Customers who have never ordered are
  // left out of the percentage: they have not had the chance to return yet.
  const buyingCustomers = groups.length;
  const repeatRate = buyingCustomers
    ? Math.round((repeatCustomers / buyingCustomers) * 100)
    : 0;

  return { totalCustomers, newCustomers, repeatCustomers, withoutOrders, repeatRate };
};

const getOrderCounts = async () => {
  const [totalOrders, ordersThisMonth, ordersToday, statusGroups] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { orderDate: { gte: startOfThisMonth() } } }),
    prisma.order.count({ where: { orderDate: { gte: startOfToday() } } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return {
    totalOrders,
    ordersThisMonth,
    ordersToday,
    byStatus: statusGroups.map((group) => ({
      status: group.status,
      orders: group._count._all,
    })),
  };
};

const getRecentActivity = async () => {
  const [recentCustomers, recentOrders] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        customerId: true,
        fullName: true,
        city: true,
        source: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.order.findMany({
      orderBy: [{ orderDate: "desc" }, { id: "desc" }],
      take: 6,
      include: { customer: { select: { customerId: true, fullName: true } } },
    }),
  ]);

  return {
    recentCustomers: recentCustomers.map(({ _count, ...customer }) => ({
      ...customer,
      totalOrders: _count.orders,
    })),
    recentOrders,
  };
};

// Where customers come from — useful for deciding where to advertise.
// There are only a handful of sources, so the list is ordered here.
const getSourceBreakdown = async () => {
  const groups = await prisma.customer.groupBy({
    by: ["source"],
    _count: { _all: true },
  });

  return groups
    .map((group) => ({ source: group.source, customers: group._count._all }))
    .sort((a, b) => b.customers - a.customers);
};

export const getDashboardOverview = async () => {
  // Independent queries, so they run together rather than one after another.
  const [customers, orders, products, activity, sources] = await Promise.all([
    getCustomerBreakdown(),
    getOrderCounts(),
    getProductPerformance(5),
    getRecentActivity(),
    getSourceBreakdown(),
  ]);

  return {
    customers,
    orders,
    products,
    sources,
    ...activity,
    generatedAt: new Date().toISOString(),
  };
};
