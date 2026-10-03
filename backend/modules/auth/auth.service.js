// Internal authentication, kept as small as it can be: staff accounts are created
// by an admin (or by the seed script), they sign in with an email and password,
// and the session is a signed JWT in an httpOnly cookie.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";
import { env, IS_PROD } from "../../config/env.js";
import { AppError } from "../../utils/appError.js";

const SALT_ROUNDS = 10;

// Never send the password hash to the client.
const PUBLIC_USER_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
};

export const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

// One place decides how the session cookie is set, so login and logout can never
// disagree about its flags.
export const cookieOptions = () => ({
  httpOnly: true, // page scripts cannot read it
  // In production the frontend (Vercel) and the API live on different sites, so
  // the cookie must be allowed cross-site. "none" requires `secure`.
  sameSite: IS_PROD ? "none" : "lax",
  secure: IS_PROD, // over HTTPS only in production
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // The same message for a wrong email and a wrong password, so the form cannot
  // be used to find out which accounts exist.
  const invalid = new AppError("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401);
  if (!user) throw invalid;

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) throw invalid;

  if (!user.active) throw new AppError("تم تعطيل هذا الحساب", 403);

  const { password: _hash, ...safeUser } = user;
  return { user: safeUser, token: signToken(user) };
};

export const createUser = async ({ name, email, password, role }) => {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new AppError("يوجد حساب بهذا البريد الإلكتروني بالفعل", 409);

  return prisma.user.create({
    data: { name, email, password: await hashPassword(password), role },
    select: PUBLIC_USER_FIELDS,
  });
};

export const deleteUser = async (id, currentUserId) => {
  // Deleting yourself would end your own session mid-click and could lock
  // everyone out; another admin has to do it.
  if (id === currentUserId) throw new AppError("لا يمكنك حذف حسابك الخاص", 400);

  const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_FIELDS });
  if (!user) throw new AppError("الحساب غير موجود", 404);

  // There must always be someone who can manage accounts.
  if (user.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (admins <= 1) throw new AppError("لا يمكن حذف آخر مدير", 400);
  }

  await prisma.user.delete({ where: { id } });
  return user;
};

export const listUsers = () =>
  prisma.user.findMany({ select: PUBLIC_USER_FIELDS, orderBy: { createdAt: "asc" } });
