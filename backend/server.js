// env.js loads .env and validates it, so it must be imported before anything
// that reads configuration.
import { env } from "./config/env.js";
import app from "./app.js";
import prisma from "./lib/prisma.js";

const server = app.listen(env.PORT, () => {
  console.log(`Print Style API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// The usual cause is a previous dev server still running. Say so instead of
// printing a raw stack trace.
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${env.PORT} is already in use. Stop the other server or set PORT in .env.`,
    );
    process.exit(1);
  }
  throw error;
});

// Graceful shutdown: stop accepting connections, finish the ones in flight, then
// close the database pool.
const shutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Do not hang forever if a connection is stuck.
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
