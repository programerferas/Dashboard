/**
 * Creates the first admin account, so someone can sign in after a fresh deploy.
 *
 * Run with:  npm run seed
 *
 * The email and password come from SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in
 * the environment. Nothing else in the database is touched, and running it
 * again is safe: an existing account is never duplicated and its password is
 * never changed. Further staff accounts are created by the admin in Settings.
 */
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";
import { hashPassword } from "../modules/auth/auth.service.js";

const seedStaff = async () => {
  const accounts = [
    {
      name: "Print Style Admin",
      email: env.SEED_ADMIN_EMAIL,
      password: env.SEED_ADMIN_PASSWORD,
      role: "ADMIN",
    },
  ];

  for (const account of accounts) {
    // Upsert, so re-seeding never locks you out and never changes a password you
    // have already set yourself.
    await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, role: account.role, active: true },
      create: {
        name: account.name,
        email: account.email,
        role: account.role,
        password: await hashPassword(account.password),
      },
    });
  }

  return accounts;
};

const main = async () => {
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env first.");
  }

  const staff = await seedStaff();

  // The password is deliberately not printed: on a server, logs are kept.
  for (const account of staff) {
    console.log(`Admin account is ready`);
  }
};

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
