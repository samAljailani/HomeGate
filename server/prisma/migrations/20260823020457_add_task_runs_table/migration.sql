-- CreateTable
CREATE TABLE "task_runs" (
    "id" UUID NOT NULL,
    "task_name" VARCHAR(128) NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "finished_at" TIMESTAMPTZ(6) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error_message" TEXT,

    CONSTRAINT "task_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_runs_task_name_started_at_idx" ON "task_runs"("task_name", "started_at");
