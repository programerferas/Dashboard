// A single PrismaClient for the whole process. Creating one per request would
// open a new connection pool every time.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export default prisma;
