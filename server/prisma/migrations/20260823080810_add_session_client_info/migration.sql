-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "browser" VARCHAR(64),
ADD COLUMN     "device" VARCHAR(64),
ADD COLUMN     "ip_address" VARCHAR(45),
ADD COLUMN     "user_agent" TEXT;
