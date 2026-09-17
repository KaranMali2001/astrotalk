/*
  Warnings:

  - Added the required column `perMinuteRateVideoCall` to the `professionals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."CallState" ADD VALUE 'CALL_CANCELLED';
ALTER TYPE "public"."CallState" ADD VALUE 'CHAT_CANCELLED';

-- AlterEnum
ALTER TYPE "public"."CallType" ADD VALUE 'VIDEO_CALL';

-- AlterTable
ALTER TABLE "public"."professionals" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "gender" VARCHAR(10),
ADD COLUMN     "language" VARCHAR(20),
ADD COLUMN     "perMinuteRateVideoCall" INTEGER NOT NULL,
ADD COLUMN     "relationshipGoals" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "voiceRecording" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "gender" VARCHAR(10),
ADD COLUMN     "language" VARCHAR(20),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "relationshipGoals" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "userType" VARCHAR(20),
ADD COLUMN     "voiceRecording" TEXT;
