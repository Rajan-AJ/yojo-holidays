-- Phase 5: visa system.
-- * VisaCountry is now unique per destination + passport (requirements differ by passport).
-- * VisaEligibility is replaced by VisaType.kind (one kind per visa type and passport guide).
-- * The free-text application process becomes ordered VisaProcessStep rows.
--   (Only development sample data existed in applicationProcess.)
-- * FAQ placement VISA for general visa questions on /visa/.
-- * Country.demonym for page titles ("Indian travellers").

-- AlterEnum
ALTER TYPE "FaqPlacement" ADD VALUE 'VISA';

-- DropForeignKey
ALTER TABLE "VisaEligibility" DROP CONSTRAINT "VisaEligibility_passportCountryId_fkey";

-- DropForeignKey
ALTER TABLE "VisaEligibility" DROP CONSTRAINT "VisaEligibility_visaTypeId_fkey";

-- DropIndex
DROP INDEX "VisaCountry_countryId_key";

-- AlterTable
ALTER TABLE "Country" ADD COLUMN     "demonym" TEXT;

-- AlterTable
-- Visa guides become passport-specific. Existing guides were written for
-- Indian passport holders (the site's default), so backfill them to India.
ALTER TABLE "VisaCountry" ADD COLUMN     "passportCountryId" TEXT;
UPDATE "VisaCountry" SET "passportCountryId" = (SELECT "id" FROM "Country" WHERE "isoCode" = 'IN')
  WHERE "passportCountryId" IS NULL;
ALTER TABLE "VisaCountry" ALTER COLUMN "passportCountryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "VisaType" DROP COLUMN "applicationProcess",
ADD COLUMN     "kind" "VisaEligibilityKind";

-- DropTable
DROP TABLE "VisaEligibility";

-- CreateTable
CREATE TABLE "VisaProcessStep" (
    "id" TEXT NOT NULL,
    "visaTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VisaProcessStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisaProcessStep_visaTypeId_sortOrder_idx" ON "VisaProcessStep"("visaTypeId", "sortOrder");

-- CreateIndex
CREATE INDEX "VisaCountry_passportCountryId_status_idx" ON "VisaCountry"("passportCountryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VisaCountry_countryId_passportCountryId_key" ON "VisaCountry"("countryId", "passportCountryId");

-- AddForeignKey
ALTER TABLE "VisaCountry" ADD CONSTRAINT "VisaCountry_passportCountryId_fkey" FOREIGN KEY ("passportCountryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaProcessStep" ADD CONSTRAINT "VisaProcessStep_visaTypeId_fkey" FOREIGN KEY ("visaTypeId") REFERENCES "VisaType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
