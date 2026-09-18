import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSubAdmin } from "@/lib/admin-auth";
import { canSubmitForReview } from "@/lib/question-workflow";
import { logAdminActivity } from "@/lib/activity-logger";
import { notifyQuestionSubmitted } from "@/lib/notifications";

/**
 * POST /api/sub-admin/questions/[id]/submit
 * DRAFT -> PENDING_REVIEW or REJECTED -> PENDING_REVIEW (resubmission).
 * Ownership + state enforced server-side. Editing never silently resubmits —
 * this action is deliberate.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const subAdmin = await requireSubAdmin();
  if (!subAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.question.findUnique({
    where: { id },
    include: { subject: { select: { name: true } } },
  });
  if (!existing || existing.createdBy !== subAdmin.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canSubmitForReview(existing.status)) {
    return NextResponse.json(
      { error: `Questions in "${existing.status}" state cannot be submitted for review.` },
      { status: 409 }
    );
  }

  const question = await prisma.question.update({
    where: { id },
    data: {
      status: "PENDING_REVIEW",
      reviewFeedback: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    include: { subject: { select: { name: true } } },
  });

  await logAdminActivity(subAdmin.userId, "question_submitted_for_review", {
    targetType: "question",
    targetId: id,
    details: { subjectId: existing.subjectId },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  await notifyQuestionSubmitted({
    text: question.text,
    subjectName: question.subject.name,
  });

  return NextResponse.json({ ok: true, status: question.status });
}