// Environment is validated once, at boot. A missing variable should crash the
// server on startup with a clear message, never fail one random request later.
import "dotenv/config";
import { z } from "zod";

// `SEED_ADMIN_EMAIL=` with nothing after it means "not set".
const emptyToUndefined = (value) => (value === "" ? undefined : value);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  COOKIE_NAME: z.string().default("ps_token"),

  FRONTEND_URLS: z.string().default("http://localhost:5173"),

  // Only the seed script needs these, so the server starts without them. There is
  // deliberately no default: a forgotten variable must not create an admin with a
  // well-known password.
  SEED_ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.string().email().optional()),
  SEED_ADMIN_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(8).optional()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  console.error("\nCopy .env.example to .env and fill it in.");
  process.exit(1);
}

export const env = parsed.data;
export const IS_PROD = env.NODE_ENV === "production";
export const ALLOWED_ORIGINS = env.FRONTEND_URLS.split(",").map((url) => url.trim());
