-- CreateEnum
CREATE TYPE "WhatsappStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "whatsappError" TEXT,
ADD COLUMN     "whatsappSentAt" TIMESTAMP(3),
ADD COLUMN     "whatsappStatus" "WhatsappStatus";
