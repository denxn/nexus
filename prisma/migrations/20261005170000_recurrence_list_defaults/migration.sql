
-- AlterTable
ALTER TABLE "Todo" ALTER COLUMN "repeatWeekdays" SET DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "repeatWeekdays" SET DEFAULT ARRAY[]::INTEGER[],
ALTER COLUMN "skippedDays" SET DEFAULT ARRAY[]::TEXT[];


-- Rows created before the defaults existed hold NULL in the list columns.
UPDATE "Event" SET "repeatWeekdays" = ARRAY[]::INTEGER[] WHERE "repeatWeekdays" IS NULL;
UPDATE "Event" SET "skippedDays" = ARRAY[]::TEXT[] WHERE "skippedDays" IS NULL;
UPDATE "Todo" SET "repeatWeekdays" = ARRAY[]::INTEGER[] WHERE "repeatWeekdays" IS NULL;
