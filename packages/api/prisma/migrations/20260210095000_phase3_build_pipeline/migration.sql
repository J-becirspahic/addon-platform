-- CreateEnum
CREATE TYPE "AddonType" AS ENUM ('WIDGET', 'CONNECTOR', 'THEME');

-- AlterTable: Add isAdmin to User
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add type to Addon
ALTER TABLE "Addon" ADD COLUMN "type" "AddonType" NOT NULL DEFAULT 'WIDGET';

-- AlterTable: Add build fields to AddonVersion
ALTER TABLE "AddonVersion" ADD COLUMN "buildReport" JSONB;
ALTER TABLE "AddonVersion" ADD COLUMN "buildStartedAt" TIMESTAMP(3);
ALTER TABLE "AddonVersion" ADD COLUMN "buildFinishedAt" TIMESTAMP(3);

-- Remove unused enum values from VersionStatus
ALTER TYPE "VersionStatus" RENAME TO "VersionStatus_old";
CREATE TYPE "VersionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'BUILDING', 'PUBLISHED', 'FAILED');
ALTER TABLE "AddonVersion" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "AddonVersion" ALTER COLUMN "status" TYPE "VersionStatus" USING ("status"::text::"VersionStatus");
ALTER TABLE "AddonVersion" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
DROP TYPE "VersionStatus_old";
