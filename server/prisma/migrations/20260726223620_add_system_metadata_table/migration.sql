-- CreateTable
CREATE TABLE "system_metadata" (
    "key" VARCHAR(128) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_metadata_pkey" PRIMARY KEY ("key")
);
