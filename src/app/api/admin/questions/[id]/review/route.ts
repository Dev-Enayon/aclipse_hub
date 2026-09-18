import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHeadAdmin } from "@/lib/admin-auth";
import { applyReview, canApprove } from "@/lib/question-workflow";
import { logAdminActivity } from "@/lib/activity-logger";
import { notifyQuestionReviewed } from "@/lib/notifications";

/**
 * POST /api/admin/questions/[id]/review
 * Head Admin only. Body: { action: "approve" | "reject", feedback?: string }
 * PENDING_REVIEW -> APPROVED (clears feedback) or -> REJECTED (with feedback).
 * Self-approval is impossible: the reviewer must differ from the author.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireHeadAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.question.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true } },
      author: { select: { id: true, email: true, name: true } },
    },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canApprove(admin.userId, existing.createdBy)) {
    return NextResponse.json(
      { error: "A Sub-Admin cannot review their own question." },
      { status: 409 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action === "approve" || body.action === "reject" ? body.action : null;
  if (!action) {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  let transition: { status: string; reviewFeedback: string | null };
  try {
    transition = applyReview(existing.status, {
      action,
      reviewerId: admin.userId,
      authorId: existing.createdBy,
      feedback: typeof body.feedback === "string" ? body.feedback : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid review transition" },
      { status: 409 }
    );
  }

  const updated = await prisma.question.update({
    where: { id },
    data: {
      status: transition.status,
      reviewFeedback: transition.reviewFeedback,
      reviewedBy: admin.userId,
      reviewedAt: new Date(),
    },
  });

  await logAdminActivity(admin.userId, transition.status === "APPROVED" ? "question_approved" : "question_rejected", {
    targetType: "question",
    targetId: id,
    details: { text: existing.text.slice(0, 100), subjectId: existing.subjectId },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  await notifyQuestionReviewed({
    subAdminEmail: existing.author?.email ?? "",
    subAdminName: existing.author?.name ?? "Sub-Admin",
    outcome: transition.status === "APPROVED" ? "approved" : "rejected",
    context: { text: existing.text, subjectName: existing.subject.name },
    feedback: transition.reviewFeedback,
  });

  return NextResponse.json({ ok: true, status: updated.status });
}