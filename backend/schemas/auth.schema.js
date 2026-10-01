import { z } from "zod";
import { ROLES } from "../lib/constants.js";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("أدخل بريدًا إلكترونيًا صحيحًا"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

// Only an admin may create staff accounts (see auth.routes.js).
export const createUserSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جدًا").max(80),
  email: z.string().trim().toLowerCase().email("أدخل بريدًا إلكترونيًا صحيحًا"),
  password: z.string().min(8, "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل"),
  role: z.enum(ROLES).default("EMPLOYEE"),
});
