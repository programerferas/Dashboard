import { z } from "zod";

const optionalText = (max = 200) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export const createProductSchema = z.object({
  name: z.string().trim().min(2, "اسم المنتج مطلوب").max(120),
  category: z.string().trim().min(2, "الفئة مطلوبة").max(60),
  occasion: optionalText(60),
  // z.coerce.boolean() would turn the string "false" into true, so map the
  // strings a form can send explicitly.
  active: z.preprocess(
    (value) => (value === "true" ? true : value === "false" ? false : value),
    z.boolean().default(true),
  ),
  notes: optionalText(500),
});

export const updateProductSchema = createProductSchema.partial();

export const productListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  active: z.enum(["ALL", "TRUE", "FALSE"]).default("ALL"),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
