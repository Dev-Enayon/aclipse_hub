-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "examType" TEXT NOT NULL DEFAULT 'CBT',
ADD COLUMN     "schoolTier" TEXT;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "examType" TEXT NOT NULL DEFAULT 'CBT',
ADD COLUMN     "schoolTier" TEXT;

-- AlterTable
ALTER TABLE "results" ADD COLUMN     "releaseToken" TEXT,
ADD COLUMN     "releasedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "student_attempts" ADD COLUMN     "entryCodeId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
ADD COLUMN     "studentName" TEXT,
ALTER COLUMN "studentId" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "entry_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cbtId" TEXT,
    "studentName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNUSED',
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entry_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "recipientRole" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entry_codes_code_key" ON "entry_codes"("code");

-- CreateIndex
CREATE INDEX "entry_codes_cbtId_idx" ON "entry_codes"("cbtId");

-- CreateIndex
CREATE INDEX "entry_codes_status_idx" ON "entry_codes"("status");

-- CreateIndex
CREATE INDEX "notifications_recipientUserId_readAt_idx" ON "notifications"("recipientUserId", "readAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_recipientRole_createdAt_idx" ON "notifications"("recipientRole", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "results_releaseToken_key" ON "results"("releaseToken");

-- AddForeignKey
ALTER TABLE "student_attempts" ADD CONSTRAINT "student_attempts_entryCodeId_fkey" FOREIGN KEY ("entryCodeId") REFERENCES "entry_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_codes" ADD CONSTRAINT "entry_codes_cbtId_fkey" FOREIGN KEY ("cbtId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_codes" ADD CONSTRAINT "entry_codes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

