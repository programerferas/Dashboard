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

// Anyone can change their own name, email and password, but only after proving
// they know the current password: a session left open on a shared computer must
// not be enough to take the account over.
export const updateAccountSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جدًا").max(80).optional(),
  email: z.string().trim().toLowerCase().email("أدخل بريدًا إلكترونيًا صحيحًا").optional(),
  newPassword: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(8, "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل").optional(),
  ),
  currentPassword: z.string().min(1, "أدخل كلمة المرور الحالية"),
});
