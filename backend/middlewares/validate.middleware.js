import { z } from "zod";
import { AppError } from "../utils/appError.js";

// Zod's built-in messages, in Arabic. Messages written into the schemas
// themselves take priority over these.
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return {
        message:
          issue.received === "undefined" || issue.received === "null"
            ? "هذا الحقل مطلوب"
            : "قيمة غير صالحة",
      };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: "اختر قيمة من القائمة" };
    case z.ZodIssueCode.invalid_string:
      return {
        message: issue.validation === "email" ? "أدخل بريدًا إلكترونيًا صحيحًا" : "صيغة غير صالحة",
      };
    case z.ZodIssueCode.invalid_date:
      return { message: "أدخل تاريخًا صحيحًا" };
    case z.ZodIssueCode.too_small:
      return {
        message:
          issue.type === "string"
            ? `يجب ألا يقل عن ${issue.minimum} أحرف`
            : `يجب ألا يقل عن ${issue.minimum}`,
      };
    case z.ZodIssueCode.too_big:
      return {
        message:
          issue.type === "string"
            ? `يجب ألا يزيد عن ${issue.maximum} حرفًا`
            : `يجب ألا يزيد عن ${issue.maximum}`,
      };
    default:
      return { message: ctx.defaultError };
  }
});

// The field names people see on the forms, so an error reads "الهاتف: ..."
// rather than "phone: ...".
const FIELD_LABELS = {
  fullName: "الاسم الكامل",
  name: "الاسم",
  phone: "الهاتف",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  role: "الدور",
  age: "العمر",
  gender: "الجنس",
  city: "المدينة",
  country: "الدولة",
  source: "المصدر",
  notes: "الملاحظات",
  customerId: "العميل",
  productId: "المنتج",
  productName: "اسم المنتج",
  category: "الفئة",
  occasion: "المناسبة",
  orderDate: "تاريخ الطلب",
  quantity: "الكمية",
  status: "الحالة",
  active: "الحالة",
  search: "البحث",
  sort: "الترتيب",
  createdFrom: "أُضيف من",
  createdTo: "أُضيف حتى",
  dateFrom: "تاريخ الطلب من",
  dateTo: "تاريخ الطلب إلى",
};

// Validates (and coerces) one part of the request against a Zod schema, then
// replaces it with the parsed result, so handlers receive clean typed data.
//
// Note for a future upgrade: this reassigns req.query, which works on Express 4.
// Express 5 makes req.query a getter-only property, so it would need to write the
// parsed values somewhere else (for example req.validatedQuery) instead.
export const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => {
        // Nested fields (newCustomer.phone) are labelled by their last part.
        const field = issue.path.join(".");
        const label = FIELD_LABELS[issue.path.at(-1)] ?? (field || source);
        return `${label}: ${issue.message}`;
      })
      .join("، ");
    return next(new AppError(message, 422));
  }

  req[source] = result.data;
  return next();
};
