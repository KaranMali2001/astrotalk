/*
  Warnings:

  - Made the column `agoraChannelId` on table `calls` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."calls" ALTER COLUMN "agoraChannelId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."temp_otps" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '10 minutes';
