import { AppError } from "../utils/appError.js";
import { IS_PROD } from "../config/env.js";

// The single place that turns a thrown error into a JSON response.
export const errorMiddleware = (error, req, res, _next) => {
  // Errors we raised ourselves carry a safe message and status code.
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  // Prisma's unique-constraint violation reads much better as a 409.
  if (error?.code === "P2002") {
    const field = error.meta?.target?.[0] ?? "value";
    return res.status(409).json({ message: `هذه القيمة (${field}) مستخدمة بالفعل` });
  }

  // A referenced row does not exist (e.g. an order pointing at a missing customer).
  if (error?.code === "P2003" || error?.code === "P2025") {
    return res.status(400).json({ message: "السجل المرتبط غير موجود" });
  }

  // Prisma refused the query's shape (e.g. a value that is not a valid enum).
  // That comes from bad input, not a server bug.
  if (error?.name === "PrismaClientValidationError") {
    return res.status(400).json({ message: "قيمة غير صالحة في الطلب" });
  }

  // The database is unreachable or the credentials in .env are wrong. This is a
  // setup problem, not a bad request, so say so plainly instead of "server error".
  // Prisma reports it as an initialisation error, which carries `errorCode`
  // rather than the `code` used by query errors.
  const connectionCode = error?.code ?? error?.errorCode;
  if (
    error?.name === "PrismaClientInitializationError" ||
    ["P1000", "P1001", "P1002", "P1003"].includes(connectionCode)
  ) {
    console.error("Database connection failed:", error.message);
    // 500, not 503: some hosts replace a 503 with their own HTML page, which has
    // no CORS headers, so the browser would only report "cannot reach server".
    return res.status(500).json({
      message:
        "تعذّر الاتصال بقاعدة البيانات. تحقّق من DATABASE_URL ومن أن PostgreSQL يعمل.",
      code: connectionCode,
    });
  }

  // The tables were never created: migrations have not been applied to this database.
  if (error?.code === "P2021" || error?.code === "P2022") {
    console.error("Database schema missing:", error.message);
    return res.status(500).json({
      message: "جداول قاعدة البيانات غير موجودة. شغّل: npx prisma migrate deploy",
      code: error.code,
    });
  }

  // Anything else is a bug: log it in full, but never leak internals to the client.
  // The Prisma error code (e.g. P2010) is safe to show and makes logs unnecessary
  // for the common setup mistakes.
  console.error("Unhandled error:", error);
  return res.status(500).json({
    message: "حدث خطأ في الخادم",
    ...(error?.code ? { code: error.code } : {}),
    ...(IS_PROD ? {} : { detail: error?.message }),
  });
};
