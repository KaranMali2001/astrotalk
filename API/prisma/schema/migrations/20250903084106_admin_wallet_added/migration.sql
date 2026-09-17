/*
  Warnings:

  - A unique constraint covering the columns `[adminId]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."temp_otps" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '10 minutes';

-- AlterTable
ALTER TABLE "public"."wallets" ADD COLUMN     "adminId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "wallets_adminId_key" ON "public"."wallets"("adminId");

-- AddForeignKey
ALTER TABLE "public"."wallets" ADD CONSTRAINT "wallets_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
