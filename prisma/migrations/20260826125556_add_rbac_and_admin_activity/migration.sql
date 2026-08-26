-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "department" TEXT;

-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "totalMarks" INTEGER NOT NULL DEFAULT 60;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "marks" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "questionType" TEXT NOT NULL DEFAULT 'MCQ';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "assignedAdminId" TEXT;

-- CreateTable
CREATE TABLE "admin_activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "details" TEXT NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_activity_logs_userId_createdAt_idx" ON "admin_activity_logs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "admin_activity_logs_action_createdAt_idx" ON "admin_activity_logs"("action", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_quizzes" ADD CONSTRAINT "weekly_quizzes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
