-- CreateEnum
CREATE TYPE "repo_size" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'HUGE');

-- CreateEnum
CREATE TYPE "issue_state" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "sync_type" AS ENUM ('FULL', 'INCREMENTAL', 'ISSUES_ONLY');

-- CreateEnum
CREATE TYPE "sync_status" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "forks" INTEGER NOT NULL,
    "open_issues_count" INTEGER NOT NULL,
    "primary_language" TEXT,
    "languages" TEXT[],
    "topics" TEXT[],
    "license" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "pushed_at" TIMESTAMP(3) NOT NULL,
    "size" "repo_size" NOT NULL,
    "readme" TEXT,
    "health_score" DOUBLE PRECISION,
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "embedding_id" TEXT,
    "embedding_synced_at" TIMESTAMP(3),

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "url" TEXT NOT NULL,
    "state" "issue_state" NOT NULL,
    "labels" TEXT[],
    "comment_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "difficulty" "difficulty",
    "is_good_first_issue" BOOLEAN NOT NULL DEFAULT false,
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "embedding_id" TEXT,
    "embedding_synced_at" TIMESTAMP(3),
    "repo_id" TEXT NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "type" "sync_type" NOT NULL,
    "status" "sync_status" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "repos_processed" INTEGER NOT NULL DEFAULT 0,
    "issues_processed" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT[],

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repositories_full_name_key" ON "repositories"("full_name");

-- CreateIndex
CREATE INDEX "repositories_primary_language_idx" ON "repositories"("primary_language");

-- CreateIndex
CREATE INDEX "repositories_size_idx" ON "repositories"("size");

-- CreateIndex
CREATE INDEX "repositories_stars_idx" ON "repositories"("stars");

-- CreateIndex
CREATE INDEX "repositories_indexed_at_idx" ON "repositories"("indexed_at");

-- CreateIndex
CREATE INDEX "issues_repo_id_idx" ON "issues"("repo_id");

-- CreateIndex
CREATE INDEX "issues_state_idx" ON "issues"("state");

-- CreateIndex
CREATE INDEX "issues_is_good_first_issue_idx" ON "issues"("is_good_first_issue");

-- CreateIndex
CREATE INDEX "issues_difficulty_idx" ON "issues"("difficulty");

-- CreateIndex
CREATE INDEX "issues_indexed_at_idx" ON "issues"("indexed_at");

-- CreateIndex
CREATE INDEX "sync_logs_type_status_idx" ON "sync_logs"("type", "status");

-- CreateIndex
CREATE INDEX "sync_logs_started_at_idx" ON "sync_logs"("started_at");

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
