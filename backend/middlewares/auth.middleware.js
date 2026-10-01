import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";
import prisma from "../lib/prisma.js";

// The token travels in an httpOnly cookie, so page JavaScript cannot read it.
export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[env.COOKIE_NAME];
    if (!token) throw new AppError("يجب تسجيل الدخول أولًا", 401);

    const payload = jwt.verify(token, env.JWT_SECRET);

    // Read the user on every request so a deactivated account loses access
    // immediately instead of when their token eventually expires.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, active: true },
    });

    if (!user || !user.active) throw new AppError("حسابك لم يعد نشطًا", 401);

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("انتهت جلستك، يرجى تسجيل الدخول مجددًا", 401));
  }
};

// Role check. Kept deliberately small: ADMIN can do everything, EMPLOYEE can do
// day-to-day work. Anything finer-grained is a future concern.
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError("يجب تسجيل الدخول أولًا", 401));
  if (!roles.includes(req.user.role)) {
    return next(new AppError("ليست لديك صلاحية للقيام بذلك", 403));
  }
  return next();
};
