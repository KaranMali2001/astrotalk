/*
  Warnings:

  - You are about to drop the column `perMinuteRate` on the `professionals` table. All the data in the column will be lost.
  - You are about to drop the column `method` on the `transactions` table. All the data in the column will be lost.
  - Added the required column `rate` to the `calls` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `calls` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."CallType" AS ENUM ('CHAT', 'AUDIO_CALL');

-- AlterEnum
ALTER TYPE "public"."TransactionType" ADD VALUE 'COMMISSION';

-- DropIndex
DROP INDEX "public"."professionals_perMinuteRate_idx";

-- DropIndex
DROP INDEX "public"."transactions_method_idx";

-- AlterTable
ALTER TABLE "public"."calls" ADD COLUMN     "rate" INTEGER NOT NULL,
ADD COLUMN     "type" "public"."CallType" NOT NULL;

-- AlterTable
ALTER TABLE "public"."professionals" DROP COLUMN "perMinuteRate",
ADD COLUMN     "aboutMe" TEXT,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "perMinuteRateCall" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "perMinuteRateChat" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "public"."temp_otps" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '10 minutes';

-- AlterTable
ALTER TABLE "public"."transactions" DROP COLUMN "method",
ALTER COLUMN "balanceBefore" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "isInCall" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."wallets" ADD COLUMN     "totalBalence" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "public"."TransactionMethod";

-- CreateIndex
CREATE INDEX "professionals_perMinuteRateChat_idx" ON "public"."professionals"("perMinuteRateChat");

-- CreateIndex
CREATE INDEX "professionals_perMinuteRateCall_idx" ON "public"."professionals"("perMinuteRateCall");
