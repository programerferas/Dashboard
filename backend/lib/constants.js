// The allowed values that both the API and the forms rely on. Keeping them in
// one file means a new source or status is added in exactly one place.
export const GENDERS = ["MALE", "FEMALE", "OTHER"];

export const CUSTOMER_SOURCES = [
  "INSTAGRAM",
  "FACEBOOK",
  "WHATSAPP",
  "REFERRAL",
  "WEBSITE",
  "WALK_IN",
  "OTHER",
];

export const ORDER_STATUSES = ["PENDING", "PROCESSING", "READY", "DELIVERED", "CANCELLED"];

export const ROLES = ["ADMIN", "EMPLOYEE"];

// Derived, never stored: a customer with more than one order is a repeat customer.
export const CUSTOMER_STATUS = {
  NEW: "NEW",
  REPEAT: "REPEAT",
  NO_ORDERS: "NO_ORDERS",
};
