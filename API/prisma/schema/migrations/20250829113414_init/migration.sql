-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('BOT', 'USER', 'PROFESSIONAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."CallState" AS ENUM ('CALL_INITIATED', 'CALL_START', 'CALL_END', 'BILLING_PROCESSED');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('WALLET_CREDIT', 'CALL_CHARGE', 'REFUND', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "public"."TransactionMethod" AS ENUM ('TOPUP', 'CALL_PAYMENT', 'REFUND', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."LogLevel" AS ENUM ('ERROR', 'WARN', 'INFO', 'DEBUG');

-- CreateTable
CREATE TABLE "public"."admins" (
    "id" UUID NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calls" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "callState" "public"."CallState" NOT NULL,
    "callDuration" INTEGER NOT NULL DEFAULT 0,
    "totalCharge" INTEGER NOT NULL DEFAULT 0,
    "callStart" TIMESTAMP(3),
    "callEnd" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "eventType" VARCHAR(64) NOT NULL,
    "logLevel" "public"."LogLevel" NOT NULL DEFAULT 'INFO',
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."professionals" (
    "id" UUID NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isInCall" BOOLEAN NOT NULL DEFAULT false,
    "perMinuteRate" INTEGER NOT NULL,
    "totalCallDuration" INTEGER NOT NULL DEFAULT 0,
    "totalChats" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."professional_categories" (
    "id" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."temp_otps" (
    "id" UUID NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT now() + interval '10 minutes',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temp_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" UUID NOT NULL,
    "gatewayTxnId" VARCHAR(100),
    "walletId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "method" "public"."TransactionMethod" NOT NULL,
    "status" "public"."TransactionStatus" NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "paymentProvider" VARCHAR(64),
    "description" TEXT,
    "userId" UUID,
    "professionalId" UUID,
    "adminId" UUID,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "username" TEXT,
    "avatarUrl" VARCHAR(2048),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_sessions" (
    "id" UUID NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deviceId" VARCHAR(64),
    "deviceType" VARCHAR(16),
    "deviceModel" VARCHAR(64),
    "osName" VARCHAR(64),
    "osVersion" VARCHAR(32),
    "appVersion" VARCHAR(32),
    "ipAddress" VARCHAR(45),
    "locationCity" VARCHAR(64),
    "locationState" VARCHAR(64),
    "locationCountry" VARCHAR(64),
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),
    "sessionDuration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userRole" "public"."UserRole" NOT NULL,
    "userId" UUID,
    "professionalId" UUID,
    "adminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wallets" (
    "id" UUID NOT NULL,
    "balance" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "userId" UUID,
    "professionalId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_phoneNumber_key" ON "public"."admins"("phoneNumber");

-- CreateIndex
CREATE INDEX "admins_phoneNumber_idx" ON "public"."admins"("phoneNumber");

-- CreateIndex
CREATE INDEX "admins_isActive_idx" ON "public"."admins"("isActive");

-- CreateIndex
CREATE INDEX "admins_deletedAt_idx" ON "public"."admins"("deletedAt");

-- CreateIndex
CREATE INDEX "calls_userId_idx" ON "public"."calls"("userId");

-- CreateIndex
CREATE INDEX "calls_professionalId_idx" ON "public"."calls"("professionalId");

-- CreateIndex
CREATE INDEX "calls_callState_idx" ON "public"."calls"("callState");

-- CreateIndex
CREATE INDEX "calls_callStart_idx" ON "public"."calls"("callStart");

-- CreateIndex
CREATE INDEX "calls_createdAt_idx" ON "public"."calls"("createdAt");

-- CreateIndex
CREATE INDEX "calls_deletedAt_idx" ON "public"."calls"("deletedAt");

-- CreateIndex
CREATE INDEX "calls_userId_createdAt_idx" ON "public"."calls"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "calls_professionalId_createdAt_idx" ON "public"."calls"("professionalId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "public"."categories"("name");

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "public"."categories"("isActive");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "public"."categories"("name");

-- CreateIndex
CREATE INDEX "categories_deletedAt_idx" ON "public"."categories"("deletedAt");

-- CreateIndex
CREATE INDEX "logs_userId_idx" ON "public"."logs"("userId");

-- CreateIndex
CREATE INDEX "logs_eventType_idx" ON "public"."logs"("eventType");

-- CreateIndex
CREATE INDEX "logs_logLevel_idx" ON "public"."logs"("logLevel");

-- CreateIndex
CREATE INDEX "logs_timestamp_idx" ON "public"."logs"("timestamp");

-- CreateIndex
CREATE INDEX "logs_eventType_timestamp_idx" ON "public"."logs"("eventType", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_phoneNumber_key" ON "public"."professionals"("phoneNumber");

-- CreateIndex
CREATE INDEX "professionals_phoneNumber_idx" ON "public"."professionals"("phoneNumber");

-- CreateIndex
CREATE INDEX "professionals_isActive_idx" ON "public"."professionals"("isActive");

-- CreateIndex
CREATE INDEX "professionals_isVerified_idx" ON "public"."professionals"("isVerified");

-- CreateIndex
CREATE INDEX "professionals_isInCall_idx" ON "public"."professionals"("isInCall");

-- CreateIndex
CREATE INDEX "professionals_deletedAt_idx" ON "public"."professionals"("deletedAt");

-- CreateIndex
CREATE INDEX "professionals_perMinuteRate_idx" ON "public"."professionals"("perMinuteRate");

-- CreateIndex
CREATE INDEX "professionals_rating_idx" ON "public"."professionals"("rating");

-- CreateIndex
CREATE INDEX "professional_categories_professionalId_idx" ON "public"."professional_categories"("professionalId");

-- CreateIndex
CREATE INDEX "professional_categories_categoryId_idx" ON "public"."professional_categories"("categoryId");

-- CreateIndex
CREATE INDEX "professional_categories_deletedAt_idx" ON "public"."professional_categories"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "professional_categories_professionalId_categoryId_key" ON "public"."professional_categories"("professionalId", "categoryId");

-- CreateIndex
CREATE INDEX "temp_otps_expiresAt_idx" ON "public"."temp_otps"("expiresAt");

-- CreateIndex
CREATE INDEX "temp_otps_phoneNumber_idx" ON "public"."temp_otps"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "temp_otps_requestId_phoneNumber_key" ON "public"."temp_otps"("requestId", "phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_gatewayTxnId_key" ON "public"."transactions"("gatewayTxnId");

-- CreateIndex
CREATE INDEX "transactions_walletId_idx" ON "public"."transactions"("walletId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "public"."transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_method_idx" ON "public"."transactions"("method");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "public"."transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "public"."transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_walletId_createdAt_idx" ON "public"."transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "public"."transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_professionalId_idx" ON "public"."transactions"("professionalId");

-- CreateIndex
CREATE INDEX "transactions_adminId_idx" ON "public"."transactions"("adminId");

-- CreateIndex
CREATE INDEX "transactions_deletedAt_idx" ON "public"."transactions"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "public"."users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_phoneNumber_idx" ON "public"."users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "public"."users"("isActive");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "public"."users"("deletedAt");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "public"."users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionToken_key" ON "public"."user_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "user_sessions_sessionToken_idx" ON "public"."user_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "user_sessions_expiresAt_idx" ON "public"."user_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "user_sessions_userRole_idx" ON "public"."user_sessions"("userRole");

-- CreateIndex
CREATE INDEX "user_sessions_isActive_idx" ON "public"."user_sessions"("isActive");

-- CreateIndex
CREATE INDEX "user_sessions_loginAt_idx" ON "public"."user_sessions"("loginAt");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "public"."user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_professionalId_idx" ON "public"."user_sessions"("professionalId");

-- CreateIndex
CREATE INDEX "user_sessions_adminId_idx" ON "public"."user_sessions"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "public"."wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_professionalId_key" ON "public"."wallets"("professionalId");

-- CreateIndex
CREATE INDEX "wallets_userId_idx" ON "public"."wallets"("userId");

-- CreateIndex
CREATE INDEX "wallets_professionalId_idx" ON "public"."wallets"("professionalId");

-- CreateIndex
CREATE INDEX "wallets_currency_idx" ON "public"."wallets"("currency");

-- CreateIndex
CREATE INDEX "wallets_updatedAt_idx" ON "public"."wallets"("updatedAt");

-- AddForeignKey
ALTER TABLE "public"."calls" ADD CONSTRAINT "calls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calls" ADD CONSTRAINT "calls_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."logs" ADD CONSTRAINT "logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."professional_categories" ADD CONSTRAINT "professional_categories_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."professional_categories" ADD CONSTRAINT "professional_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallets" ADD CONSTRAINT "wallets_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
