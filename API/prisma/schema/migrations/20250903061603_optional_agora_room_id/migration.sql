-- AlterTable
ALTER TABLE "public"."calls" ALTER COLUMN "agoraChannelId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."temp_otps" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '10 minutes';
