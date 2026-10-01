// The dropdown options and badge colours used across the app. These mirror the
// enums in the Prisma schema; adding a value means adding it in both places.
import { humanise } from "./format.js";

export const CUSTOMER_SOURCES = [
  "INSTAGRAM",
  "FACEBOOK",
  "WHATSAPP",
  "REFERRAL",
  "WEBSITE",
  "WALK_IN",
  "OTHER",
];

export const GENDERS = ["MALE", "FEMALE", "OTHER"];

export const ORDER_STATUSES = ["PENDING", "PROCESSING", "READY", "DELIVERED", "CANCELLED"];

export const ROLES = ["ADMIN", "EMPLOYEE"];

// Turns a list of enum values into { value, label } pairs for a <select>.
export const toOptions = (values) =>
  values.map((value) => ({ value, label: humanise(value) }));

// An order's badge colour follows its progress: waiting, in the workshop, ready,
// done, cancelled.
export const ORDER_STATUS_TONE = {
  PENDING: "slate",
  PROCESSING: "amber",
  READY: "violet",
  DELIVERED: "green",
  CANCELLED: "red",
};

export const CUSTOMER_STATUS_TONE = {
  REPEAT: "green",
  NEW: "blue",
  NO_ORDERS: "slate",
};

export const CUSTOMER_STATUS_LABEL = {
  REPEAT: "متكرر",
  NEW: "جديد",
  NO_ORDERS: "بلا طلبات",
};

// The long form, used on the customer profile where there is room for it.
export const CUSTOMER_STATUS_FULL_LABEL = {
  REPEAT: "عميل متكرر",
  NEW: "عميل جديد",
  NO_ORDERS: "لا طلبات بعد",
};

export const CUSTOMER_STATUS_FILTERS = [
  { value: "ALL", label: "كل العملاء" },
  { value: "NEW", label: "العملاء الجدد" },
  { value: "REPEAT", label: "العملاء المتكررون" },
  { value: "NO_ORDERS", label: "لا طلبات بعد" },
];

export const CUSTOMER_SORTS = [
  { value: "recent", label: "الأحدث أولًا" },
  { value: "name", label: "الاسم (أ-ي)" },
  { value: "orders", label: "الأكثر طلبات" },
  { value: "lastOrder", label: "آخر طلب" },
];

export const ORDER_SORTS = [
  { value: "recent", label: "الأحدث أولًا" },
  { value: "oldest", label: "الأقدم أولًا" },
  { value: "quantity", label: "الكمية الأكبر" },
];
