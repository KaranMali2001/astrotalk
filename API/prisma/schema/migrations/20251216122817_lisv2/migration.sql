/*
  Warnings:

  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `topics` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `userType` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `voiceRecording` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."professionals" ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "name",
DROP COLUMN "topics",
DROP COLUMN "userType",
DROP COLUMN "voiceRecording",
ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."user_categories" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_categories_userId_idx" ON "public"."user_categories"("userId");

-- CreateIndex
CREATE INDEX "user_categories_categoryId_idx" ON "public"."user_categories"("categoryId");

-- CreateIndex
CREATE INDEX "user_categories_deletedAt_idx" ON "public"."user_categories"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_categories_userId_categoryId_key" ON "public"."user_categories"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "public"."user_categories" ADD CONSTRAINT "user_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_categories" ADD CONSTRAINT "user_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
