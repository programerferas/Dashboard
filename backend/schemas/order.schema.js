import { z } from "zod";
import { ORDER_STATUSES } from "../lib/constants.js";
import { createCustomerSchema } from "./customer.schema.js";

const optionalText = (max = 200) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const orderSchema = z.object({
  // The order belongs to an existing customer, identified by their business ID.
  customerId: z.string().trim().min(2, "اختر عميلًا"),
  // Optional link to the catalogue. When given, the product's name/category fill
  // the order automatically (see order.service.js).
  //
  // The three states matter here: a product ID links the order, an empty string
  // means "no catalogue product" (and clears an existing link), and leaving the
  // field out entirely leaves the link untouched when editing.
  productId: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(20).nullable().optional(),
  ),
  productName: optionalText(120),
  category: optionalText(60),
  occasion: optionalText(60),
  orderDate: z.coerce.date({ message: "أدخل تاريخ طلب صحيحًا" }),
  quantity: z.coerce.number().int().min(1, "يجب أن تكون الكمية 1 على الأقل").max(1000).default(1),
  status: z.enum(ORDER_STATUSES).default("PROCESSING"),
  notes: optionalText(1000),
});

// A first order often comes from someone who is not in the system yet. Instead
// of an existing customerId, the order can then carry `newCustomer`, and the API
// creates that customer together with the order.
export const createOrderSchema = orderSchema
  .extend({
    customerId: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().trim().min(2, "اختر عميلًا").optional(),
    ),
    newCustomer: createCustomerSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.customerId && !data.newCustomer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerId"],
        message: "اختر عميلًا موجودًا أو أضف عميلًا جديدًا",
      });
    }
    if (data.customerId && data.newCustomer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerId"],
        message: "اختر عميلًا موجودًا أو أضف عميلًا جديدًا، وليس الاثنين معًا",
      });
    }
  });

// An order may be moved to another customer, but the customerId must still point
// at a real customer, so it stays part of the editable set. A new customer can
// only be added when the order is created.
export const updateOrderSchema = orderSchema.partial();

// Same rules as the customer list: "ALL"/empty means no filter, and anything
// else must be a real status or date, or Postgres rejects the query with a 500.
const optionalDate = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "أدخل تاريخًا صحيحًا")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const orderListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  customerId: z.string().trim().max(20).optional(),
  category: z.string().trim().max(60).optional(),
  occasion: z.string().trim().max(60).optional(),
  status: z.preprocess(
    (value) => (value === "" || value === "ALL" ? undefined : value),
    z.enum(ORDER_STATUSES).optional(),
  ),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  sort: z.enum(["recent", "oldest", "quantity"]).default("recent"),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
