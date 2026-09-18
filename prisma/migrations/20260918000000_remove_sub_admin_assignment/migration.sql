-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "students_assignedAdminId_fkey";

-- DropColumn
ALTER TABLE "students" DROP COLUMN IF EXISTS "assignedAdminId";