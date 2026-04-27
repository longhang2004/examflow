-- Add parent accounts and parent-student link workflow.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PARENT';

CREATE TYPE "ParentStudentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

ALTER TABLE "ParentStudent" ADD COLUMN "status" "ParentStudentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "ParentStudent" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
