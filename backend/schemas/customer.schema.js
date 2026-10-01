import { z } from "zod";
import { CUSTOMER_SOURCES, GENDERS } from "../lib/constants.js";

// Empty strings arrive from HTML forms for every untouched optional field.
// Turning them into undefined keeps NULL in the database instead of "".
const optionalText = (max = 200) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalEnum = (values) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.enum(values).optional(),
  );

export const createCustomerSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم الكامل مطلوب").max(120),
  phone: z
    .string()
    .trim()
    .min(6, "رقم الهاتف قصير جدًا")
    .max(30)
    // Digits, spaces and the usual + ( ) - separators.
    .regex(/^[\d\s()+-]+$/, "رقم الهاتف يقبل الأرقام و + ( ) - فقط"),
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().toLowerCase().email("أدخل بريدًا إلكترونيًا صحيحًا").optional(),
  ),
  age: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(10, "العمر يبدو صغيرًا جدًا").max(100).optional(),
  ),
  gender: optionalEnum(GENDERS),
  city: z.string().trim().min(2, "المدينة مطلوبة").max(80),
  country: z.string().trim().min(2).max(80).default("Turkey"),
  source: z.enum(CUSTOMER_SOURCES).default("OTHER"),
  notes: optionalText(1000),
});

// Editing sends only the fields that changed. customerId is absent on purpose:
// it is the relationship key and must never be edited by accident.
export const updateCustomerSchema = createCustomerSchema.partial();

// A filter left on "All" (or empty) means no filter. Anything else must be a
// real value, otherwise Postgres rejects it and the request would end as a 500.
const optionalFilterEnum = (values) =>
  z.preprocess(
    (value) => (value === "" || value === "ALL" ? undefined : value),
    z.enum(values).optional(),
  );

const optionalDate = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "أدخل تاريخًا صحيحًا")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const customerListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["ALL", "NEW", "REPEAT", "NO_ORDERS"]).default("ALL"),
  city: z.string().trim().max(80).optional(),
  source: optionalFilterEnum(CUSTOMER_SOURCES),
  createdFrom: optionalDate,
  createdTo: optionalDate,
  sort: z.enum(["recent", "name", "orders", "lastOrder"]).default("recent"),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
