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
    return res.status(503).json({
      message:
        "تعذّر الاتصال بقاعدة البيانات. تحقّق من DATABASE_URL في ملف backend/.env ومن أن PostgreSQL يعمل.",
    });
  }

  // Anything else is a bug: log it in full, but never leak internals to the client.
  console.error("Unhandled error:", error);
  return res.status(500).json({
    message: "حدث خطأ في الخادم",
    ...(IS_PROD ? {} : { detail: error?.message }),
  });
};
