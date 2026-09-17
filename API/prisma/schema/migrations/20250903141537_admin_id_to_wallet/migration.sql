-- AlterTable
ALTER TABLE "public"."temp_otps" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '10 minutes';

-- CreateIndex
CREATE INDEX "admins_createdAt_idx" ON "public"."admins"("createdAt");
