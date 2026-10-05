
-- CreateEnum
CREATE TYPE "Repeat" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "repeat" "Repeat" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "repeatInterval" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "repeatMonthDay" INTEGER,
ADD COLUMN     "repeatUntil" TEXT,
ADD COLUMN     "repeatWeekdays" INTEGER[];

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "remindMinutes" INTEGER,
ADD COLUMN     "repeat" "Repeat" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "repeatInterval" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "repeatUntil" TEXT,
ADD COLUMN     "repeatWeekdays" INTEGER[],
ADD COLUMN     "skippedDays" TEXT[];

