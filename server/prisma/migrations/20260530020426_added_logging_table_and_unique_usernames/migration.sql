/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `user_accounts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateTable
CREATE TABLE "logs" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "correlation_id" TEXT,
    "log_level" "LogLevel" NOT NULL,
    "context" TEXT,
    "message" TEXT NOT NULL,
    "stack_trace" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logs_created_at_idx" ON "logs"("created_at");

-- CreateIndex
CREATE INDEX "logs_log_level_idx" ON "logs"("log_level");

-- CreateIndex
CREATE INDEX "logs_user_id_idx" ON "logs"("user_id");

-- CreateIndex
CREATE INDEX "logs_session_id_idx" ON "logs"("session_id");

-- CreateIndex
CREATE INDEX "logs_correlation_id_idx" ON "logs"("correlation_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_username_key" ON "user_accounts"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
