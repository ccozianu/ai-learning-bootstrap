-- Migration 0002_prototype over frozen 0001_initial. Run inside a transaction.
-- CreateEnum
CREATE TYPE "ai_learning"."Role" AS ENUM ('ADMIN', 'PARENT', 'TEACHER', 'KID');

-- CreateEnum
CREATE TYPE "ai_learning"."AccountStatus" AS ENUM ('PENDING_PARENT_CONSENT', 'ACTIVE', 'CONSENT_WITHDRAWN', 'SUSPENDED', 'ANONYMIZED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ai_learning"."SignInType" ADD VALUE 'DEV_TOKEN';
ALTER TYPE "ai_learning"."SignInType" ADD VALUE 'IAP_SUPERVISOR';
ALTER TYPE "ai_learning"."SignInType" ADD VALUE 'IAP_STUDENT';
ALTER TYPE "ai_learning"."SignInType" ADD VALUE 'CLUB_OFFLINE';

-- AlterTable
ALTER TABLE "ai_learning"."users" ADD COLUMN "accountStatus" "ai_learning"."AccountStatus" NOT NULL DEFAULT 'ACTIVE';
UPDATE "ai_learning"."users" SET "accountStatus" = CASE WHEN "active" THEN 'ACTIVE'::"ai_learning"."AccountStatus" ELSE 'SUSPENDED'::"ai_learning"."AccountStatus" END;
ALTER TABLE "ai_learning"."users" DROP COLUMN "active",
ADD COLUMN     "birthYear" INTEGER,
ADD COLUMN     "birthYearAttestedAt" TIMESTAMP(3),
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "gdprConsentGrantedAt" TIMESTAMP(3),
ADD COLUMN     "gdprConsentVersion" TEXT,
ADD COLUMN     "gdprConsentWithdrawnAt" TIMESTAMP(3),
ADD COLUMN     "guardianUserId" UUID,
ADD COLUMN     "roles" "ai_learning"."Role"[] DEFAULT ARRAY['PARENT']::"ai_learning"."Role"[],
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "googleSubject" DROP NOT NULL,
ALTER COLUMN "signInTypes" SET DEFAULT ARRAY[]::"ai_learning"."SignInType"[],
ALTER COLUMN "lastSignInType" DROP NOT NULL,
ALTER COLUMN "lastSignInType" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ai_learning"."dev_login_tokens" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dev_login_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."audit_logs" (
    "id" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorUserId" UUID,
    "targetUserId" UUID,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."knowledge_nodes" (
    "id" TEXT NOT NULL,
    "tagLanguage" TEXT NOT NULL DEFAULT 'en',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionLanguage" TEXT NOT NULL DEFAULT 'en',

    CONSTRAINT "knowledge_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."knowledge_dependencies" (
    "prerequisiteNodeId" TEXT NOT NULL,
    "dependentNodeId" TEXT NOT NULL,
    "provenance" TEXT NOT NULL DEFAULT 'HUMAN_VERIFIED',
    "reviewStatus" TEXT NOT NULL DEFAULT 'APPROVED',

    CONSTRAINT "knowledge_dependencies_pkey" PRIMARY KEY ("prerequisiteNodeId","dependentNodeId")
);

-- CreateTable
CREATE TABLE "ai_learning"."curricula" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ro',
    "ageBand" TEXT NOT NULL DEFAULT '7-11',
    "sourceUrl" TEXT,
    "license" TEXT NOT NULL DEFAULT 'CC-BY-4.0',
    "attribution" TEXT NOT NULL,

    CONSTRAINT "curricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."curriculum_versions" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."curriculum_series" (
    "id" TEXT NOT NULL,
    "curriculumVersionId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lessonPresenterKey" TEXT NOT NULL,
    "exercisePresenterKey" TEXT NOT NULL,
    "exerciseGeneratorKey" TEXT NOT NULL,
    "exerciseEvaluatorKey" TEXT NOT NULL,
    "knowledgeNodeId" TEXT NOT NULL,

    CONSTRAINT "curriculum_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."lessons" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "contentJson" JSONB NOT NULL,
    "knowledgeNodeId" TEXT NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."exercises" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "exerciseType" TEXT NOT NULL,
    "promptEn" TEXT NOT NULL,
    "promptRoTemplate" TEXT NOT NULL,
    "metaJson" JSONB NOT NULL,
    "knowledgeNodeId" TEXT NOT NULL,
    "provenance" TEXT NOT NULL DEFAULT 'PROCEDURAL_SPEC',

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."parent_curriculum_approvals" (
    "id" UUID NOT NULL,
    "parentUserId" UUID NOT NULL,
    "kidUserId" UUID NOT NULL,
    "curriculumVersionId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "parent_curriculum_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."exercise_attempts" (
    "id" UUID NOT NULL,
    "clientEventId" TEXT NOT NULL,
    "studentUserId" UUID NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "knowledgeNodeId" TEXT NOT NULL,
    "submittedAnswer" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."student_knowledge_states" (
    "studentUserId" UUID NOT NULL,
    "knowledgeNodeId" TEXT NOT NULL,
    "attemptsCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "masteredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_knowledge_states_pkey" PRIMARY KEY ("studentUserId","knowledgeNodeId")
);

-- CreateTable
CREATE TABLE "ai_learning"."impersonation_sessions" (
    "id" UUID NOT NULL,
    "launchCodeHash" TEXT,
    "tokenHash" TEXT,
    "parentUserId" UUID NOT NULL,
    "parentAuthVersion" INTEGER NOT NULL,
    "kidUserId" UUID NOT NULL,
    "kidAuthVersion" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."parent_preview_attempts" (
    "id" UUID NOT NULL,
    "clientEventId" TEXT NOT NULL,
    "parentUserId" UUID NOT NULL,
    "kidUserId" UUID NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "knowledgeNodeId" TEXT NOT NULL,
    "submittedAnswer" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_preview_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning"."parent_preview_knowledge_states" (
    "parentUserId" UUID NOT NULL,
    "kidUserId" UUID NOT NULL,
    "knowledgeNodeId" TEXT NOT NULL,
    "attemptsCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "masteredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_preview_knowledge_states_pkey" PRIMARY KEY ("parentUserId","kidUserId","knowledgeNodeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "dev_login_tokens_tokenHash_key" ON "ai_learning"."dev_login_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "dev_login_tokens_userId_idx" ON "ai_learning"."dev_login_tokens"("userId");

-- CreateIndex
CREATE INDEX "dev_login_tokens_expiresAt_idx" ON "ai_learning"."dev_login_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "ai_learning"."audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_logs_targetUserId_idx" ON "ai_learning"."audit_logs"("targetUserId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "ai_learning"."audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "curriculum_versions_curriculumId_idx" ON "ai_learning"."curriculum_versions"("curriculumId");

-- CreateIndex
CREATE INDEX "curriculum_series_curriculumVersionId_idx" ON "ai_learning"."curriculum_series"("curriculumVersionId");

-- CreateIndex
CREATE INDEX "lessons_seriesId_idx" ON "ai_learning"."lessons"("seriesId");

-- CreateIndex
CREATE INDEX "exercises_lessonId_idx" ON "ai_learning"."exercises"("lessonId");

-- CreateIndex
CREATE INDEX "parent_curriculum_approvals_parentUserId_idx" ON "ai_learning"."parent_curriculum_approvals"("parentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "parent_curriculum_approvals_kidUserId_curriculumVersionId_key" ON "ai_learning"."parent_curriculum_approvals"("kidUserId", "curriculumVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_attempts_clientEventId_key" ON "ai_learning"."exercise_attempts"("clientEventId");

-- CreateIndex
CREATE INDEX "exercise_attempts_studentUserId_lessonId_idx" ON "ai_learning"."exercise_attempts"("studentUserId", "lessonId");

-- CreateIndex
CREATE INDEX "exercise_attempts_studentUserId_knowledgeNodeId_idx" ON "ai_learning"."exercise_attempts"("studentUserId", "knowledgeNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "impersonation_sessions_launchCodeHash_key" ON "ai_learning"."impersonation_sessions"("launchCodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "impersonation_sessions_tokenHash_key" ON "ai_learning"."impersonation_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "impersonation_sessions_parentUserId_idx" ON "ai_learning"."impersonation_sessions"("parentUserId");

-- CreateIndex
CREATE INDEX "impersonation_sessions_kidUserId_idx" ON "ai_learning"."impersonation_sessions"("kidUserId");

-- CreateIndex
CREATE INDEX "impersonation_sessions_expiresAt_idx" ON "ai_learning"."impersonation_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "parent_preview_attempts_clientEventId_key" ON "ai_learning"."parent_preview_attempts"("clientEventId");

-- CreateIndex
CREATE INDEX "parent_preview_attempts_parentUserId_kidUserId_lessonId_idx" ON "ai_learning"."parent_preview_attempts"("parentUserId", "kidUserId", "lessonId");

-- CreateIndex
CREATE INDEX "parent_preview_attempts_parentUserId_kidUserId_knowledgeNod_idx" ON "ai_learning"."parent_preview_attempts"("parentUserId", "kidUserId", "knowledgeNodeId");

-- CreateIndex
CREATE INDEX "users_guardianUserId_idx" ON "ai_learning"."users"("guardianUserId");

-- AddForeignKey
ALTER TABLE "ai_learning"."users" ADD CONSTRAINT "users_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "ai_learning"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."dev_login_tokens" ADD CONSTRAINT "dev_login_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."knowledge_dependencies" ADD CONSTRAINT "knowledge_dependencies_prerequisiteNodeId_fkey" FOREIGN KEY ("prerequisiteNodeId") REFERENCES "ai_learning"."knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."knowledge_dependencies" ADD CONSTRAINT "knowledge_dependencies_dependentNodeId_fkey" FOREIGN KEY ("dependentNodeId") REFERENCES "ai_learning"."knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."curriculum_versions" ADD CONSTRAINT "curriculum_versions_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "ai_learning"."curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."curriculum_series" ADD CONSTRAINT "curriculum_series_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "ai_learning"."curriculum_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."curriculum_series" ADD CONSTRAINT "curriculum_series_knowledgeNodeId_fkey" FOREIGN KEY ("knowledgeNodeId") REFERENCES "ai_learning"."knowledge_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."lessons" ADD CONSTRAINT "lessons_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ai_learning"."curriculum_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."lessons" ADD CONSTRAINT "lessons_knowledgeNodeId_fkey" FOREIGN KEY ("knowledgeNodeId") REFERENCES "ai_learning"."knowledge_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."exercises" ADD CONSTRAINT "exercises_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ai_learning"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."exercises" ADD CONSTRAINT "exercises_knowledgeNodeId_fkey" FOREIGN KEY ("knowledgeNodeId") REFERENCES "ai_learning"."knowledge_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."parent_curriculum_approvals" ADD CONSTRAINT "parent_curriculum_approvals_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."parent_curriculum_approvals" ADD CONSTRAINT "parent_curriculum_approvals_kidUserId_fkey" FOREIGN KEY ("kidUserId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."parent_curriculum_approvals" ADD CONSTRAINT "parent_curriculum_approvals_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "ai_learning"."curriculum_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."exercise_attempts" ADD CONSTRAINT "exercise_attempts_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."exercise_attempts" ADD CONSTRAINT "exercise_attempts_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ai_learning"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."student_knowledge_states" ADD CONSTRAINT "student_knowledge_states_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."student_knowledge_states" ADD CONSTRAINT "student_knowledge_states_knowledgeNodeId_fkey" FOREIGN KEY ("knowledgeNodeId") REFERENCES "ai_learning"."knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_kidUserId_fkey" FOREIGN KEY ("kidUserId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."parent_preview_attempts" ADD CONSTRAINT "parent_preview_attempts_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."parent_preview_attempts" ADD CONSTRAINT "parent_preview_attempts_kidUserId_fkey" FOREIGN KEY ("kidUserId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."parent_preview_attempts" ADD CONSTRAINT "parent_preview_attempts_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ai_learning"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."parent_preview_knowledge_states" ADD CONSTRAINT "parent_preview_knowledge_states_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."parent_preview_knowledge_states" ADD CONSTRAINT "parent_preview_knowledge_states_kidUserId_fkey" FOREIGN KEY ("kidUserId") REFERENCES "ai_learning"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_learning"."parent_preview_knowledge_states" ADD CONSTRAINT "parent_preview_knowledge_states_knowledgeNodeId_fkey" FOREIGN KEY ("knowledgeNodeId") REFERENCES "ai_learning"."knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

