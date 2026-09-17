/*
  Warnings:

  - You are about to drop the column `language` on the `professionals` table. All the data in the column will be lost.
  - You are about to drop the column `topics` on the `professionals` table. All the data in the column will be lost.
  - You are about to drop the `user_categories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."user_categories" DROP CONSTRAINT "user_categories_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_categories" DROP CONSTRAINT "user_categories_userId_fkey";

-- AlterTable
ALTER TABLE "public"."professionals" DROP COLUMN "language",
DROP COLUMN "topics";

-- DropTable
DROP TABLE "public"."user_categories";
