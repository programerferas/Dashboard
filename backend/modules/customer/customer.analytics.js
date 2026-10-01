// Everything the app "knows" about a customer's behaviour is computed here, from
// their orders. Nothing in this file touches the database or Express — they are
// plain functions over an array of orders, which makes them easy to read and to
// test, and guarantees the numbers can never drift out of sync with the orders.
import { CUSTOMER_STATUS } from "../../lib/constants.js";

// A cancelled order was never actually bought, so it does not count towards
// purchase behaviour. It is still listed in the order history, and still counted
// in `cancelledOrders`, so nothing disappears.
const isPurchase = (order) => order.status !== "CANCELLED";

// Counts occurrences of a key and returns the rows sorted biggest-first.
// Used for both "which categories" and "which products".
const rank = (orders, keyOf) => {
  const totals = new Map();

  for (const order of orders) {
    const key = keyOf(order);
    if (!key) continue;

    const current = totals.get(key) ?? { key, orders: 0, quantity: 0 };
    current.orders += 1;
    current.quantity += order.quantity;
    totals.set(key, current);
  }

  return [...totals.values()].sort(
    (a, b) => b.orders - a.orders || b.quantity - a.quantity || a.key.localeCompare(b.key),
  );
};

// New vs repeat, derived on the spot — see the note in schema.prisma about why
// this is not a database column.
export const customerStatusFromOrderCount = (orderCount) => {
  if (orderCount === 0) return CUSTOMER_STATUS.NO_ORDERS;
  if (orderCount === 1) return CUSTOMER_STATUS.NEW;
  return CUSTOMER_STATUS.REPEAT;
};

// The full behaviour picture for one customer's order list.
export const buildCustomerStats = (orders = []) => {
  const purchases = orders.filter(isPurchase);

  // Sorted oldest-first so first/last order are simply the ends of the list.
  const byDate = [...purchases].sort(
    (a, b) => new Date(a.orderDate) - new Date(b.orderDate),
  );

  const categories = rank(purchases, (order) => order.category);
  const products = rank(purchases, (order) => order.productName);
  const occasions = rank(purchases, (order) => order.occasion);

  const totalOrders = purchases.length;

  return {
    totalOrders,
    cancelledOrders: orders.length - totalOrders,
    // "Products purchased" is the number of items, not the number of orders:
    // an order of 2 hoodies is 2 products.
    totalProductsPurchased: purchases.reduce((sum, order) => sum + order.quantity, 0),
    distinctProducts: products.length,
    distinctCategories: categories.length,

    firstOrderDate: byDate[0]?.orderDate ?? null,
    lastOrderDate: byDate[byDate.length - 1]?.orderDate ?? null,
    latestOrder: byDate[byDate.length - 1] ?? null,

    mostPurchasedCategory: categories[0]?.key ?? null,
    mostPurchasedProduct: products[0]?.key ?? null,

    // Full breakdowns, so the profile page can render "Couples: 2 orders".
    categoryBreakdown: categories,
    productBreakdown: products,
    occasionBreakdown: occasions,

    status: customerStatusFromOrderCount(totalOrders),
  };
};

// The lighter version used for the customers table, where we only have counts
// and the last order date rather than the full order rows.
export const buildCustomerRowStats = (orders = []) => {
  const purchases = orders.filter(isPurchase);
  const dates = purchases.map((order) => new Date(order.orderDate));

  return {
    totalOrders: purchases.length,
    lastOrderDate: dates.length ? new Date(Math.max(...dates)).toISOString() : null,
    status: customerStatusFromOrderCount(purchases.length),
  };
};
