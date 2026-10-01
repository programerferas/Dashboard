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
  sameSite: "lax", // the dashboard is not embedded anywhere
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

export const listUsers = () =>
  prisma.user.findMany({ select: PUBLIC_USER_FIELDS, orderBy: { createdAt: "asc" } });
