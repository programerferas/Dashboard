// The Express application: middleware, routes, error handling. Starting the
// server lives in server.js so this file can also be imported by tests.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { ALLOWED_ORIGINS } from "./config/env.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { AppError } from "./utils/appError.js";

import authRoutes from "./modules/auth/auth.routes.js";
import customerRoutes from "./modules/customer/customer.routes.js";
import orderRoutes from "./modules/order/order.routes.js";
import productRoutes from "./modules/product/product.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";

const app = express();

app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "200kb" }));

// The dashboard runs on a different port in development, so the browser needs
// permission to send the session cookie across origins.
app.use(
  cors({
    origin: (origin, callback) => {
      // No origin: curl, Postman, health checks.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // A 403 that names the origin, so a frontend on an unexpected port is
      // obvious instead of a generic 500.
      return callback(
        new AppError(`المصدر ${origin} غير مسموح به. أضفه إلى FRONTEND_URLS في ملف .env`, 403),
      );
    },
    credentials: true,
  }),
);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/dashboard", dashboardRoutes);

// A JSON 404, so the frontend never has to parse Express's HTML error page.
app.use((req, res) => {
  res.status(404).json({ message: `المسار غير موجود: ${req.method} ${req.originalUrl}` });
});

app.use(errorMiddleware);

export default app;
