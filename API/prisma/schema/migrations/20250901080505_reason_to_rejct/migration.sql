/*
  Warnings:

  - Added the required column `sessionToken` to the `professional_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."CallState" ADD VALUE 'CALL_REJECTED';
ALTER TYPE "public"."CallState" ADD VALUE 'CHAT_REJECTED';

-- AlterTable
ALTER TABLE "public"."calls" ADD COLUMN     "reasonToReject" TEXT;

-- AlterTable
ALTER TABLE "public"."professional_sessions" ADD COLUMN     "sessionToken" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."temp_otps" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '10 minutes';
