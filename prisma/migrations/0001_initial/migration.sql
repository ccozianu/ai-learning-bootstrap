-- Apply once to a fresh ai_learning schema. Run inside a transaction.
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ai_learning";

-- CreateEnum
CREATE TYPE "ai_learning"."SignInType" AS ENUM ('GOOGLE', 'PASSWORD');

-- CreateTable
CREATE TABLE "ai_learning"."users" (
    "authVersion" INTEGER NOT NULL DEFAULT 0,
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "googleSubject" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT,
    "signInTypes" "ai_learning"."SignInType"[] DEFAULT ARRAY['GOOGLE']::"ai_learning"."SignInType"[],
    "lastSignInType" "ai_learning"."SignInType" NOT NULL DEFAULT 'GOOGLE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "passwordFailures" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."sessions" (
    "authVersion" INTEGER NOT NULL DEFAULT 0,
    "signInType" "ai_learning"."SignInType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "ai_learning"."challenges" (
    "authVersion" INTEGER NOT NULL DEFAULT 0,
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."trusted_devices" (
    "authVersion" INTEGER NOT NULL DEFAULT 0,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "ai_learning"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleSubject_key" ON "ai_learning"."users"("googleSubject");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "ai_learning"."users"("username");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "ai_learning"."sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "ai_learning"."sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "challenges_userId_idx" ON "ai_learning"."challenges"("userId");

-- CreateIndex
CREATE INDEX "challenges_expiresAt_idx" ON "ai_learning"."challenges"("expiresAt");

-- CreateIndex
CREATE INDEX "trusted_devices_userId_idx" ON "ai_learning"."trusted_devices"("userId");

-- CreateIndex
CREATE INDEX "trusted_devices_expiresAt_idx" ON "ai_learning"."trusted_devices"("expiresAt");

-- AddForeignKey
ALTER TABLE "ai_learning"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."challenges" ADD CONSTRAINT "challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."trusted_devices" ADD CONSTRAINT "trusted_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

