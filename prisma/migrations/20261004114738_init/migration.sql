-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('WORKOUT', 'STUDY', 'SLEEP', 'MEAL', 'MOOD');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('MANUAL', 'APPLE_HEALTH', 'GOOGLE_CAL');

-- CreateEnum
CREATE TYPE "Period" AS ENUM ('DAY', 'WEEK');

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "meta" JSONB,
    "source" "Source" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "period" "Period" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Entry_occurredAt_idx" ON "Entry"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_source_externalId_key" ON "Entry"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Target_type_period_key" ON "Target"("type", "period");
