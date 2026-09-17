/*
  Warnings:

  - Added the required column `agoraChannelId` to the `calls` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxCallDuration` to the `calls` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."TransactionType" ADD VALUE 'SESSION_REWARD';

-- AlterTable
ALTER TABLE "public"."calls" ADD COLUMN     "agoraChannelId" TEXT NOT NULL,
ADD COLUMN     "maxCallDuration" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."professionals" ADD COLUMN     "commissionRate" DECIMAL(65,30) NOT NULL DEFAULT 0.2;

-- AlterTable
ALTER TABLE "public"."temp_otps" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '10 minutes';

-- CreateTable
CREATE TABLE "public"."professional_sessions" (
    "id" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "rewardAmount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "professional_sessions_professionalId_idx" ON "public"."professional_sessions"("professionalId");

-- CreateIndex
CREATE INDEX "professional_sessions_isActive_idx" ON "public"."professional_sessions"("isActive");

-- CreateIndex
CREATE INDEX "professional_sessions_startTime_idx" ON "public"."professional_sessions"("startTime");

-- AddForeignKey
ALTER TABLE "public"."professional_sessions" ADD CONSTRAINT "professional_sessions_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
