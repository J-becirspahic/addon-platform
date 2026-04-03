-- AlterEnum: Remove unused IN_REVIEW value from VersionStatus
BEGIN;
CREATE TYPE "VersionStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'BUILDING', 'PUBLISHED', 'FAILED');
ALTER TABLE "public"."AddonVersion" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "AddonVersion" ALTER COLUMN "status" TYPE "VersionStatus_new" USING ("status"::text::"VersionStatus_new");
ALTER TYPE "VersionStatus" RENAME TO "VersionStatus_old";
ALTER TYPE "VersionStatus_new" RENAME TO "VersionStatus";
DROP TYPE "public"."VersionStatus_old";
ALTER TABLE "AddonVersion" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;
