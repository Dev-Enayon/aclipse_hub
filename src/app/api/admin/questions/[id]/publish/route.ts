import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHeadAdmin } from "@/lib/admin-auth";
import { applyPublish } from "@/lib/question-workflow";
import { logAdminActivity } from "@/lib/activity-logger";
import { notifyQuestionReviewed } from "@/lib/notifications";

/**
 * POST /api/admin/questions/[id]/publish
 * Head Admin only. Explicit APPROVED -> PUBLISHED release for students.
 * Publishing is a separate deliberate action and never happens automatically.
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

  let transition: { status: "PUBLISHED" };
  try {
    transition = applyPublish(existing.status);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid publish transition" },
      { status: 409 }
    );
  }

  const updated = await prisma.question.update({
    where: { id },
    data: { status: transition.status },
  });

  await logAdminActivity(admin.userId, "question_published", {
    targetType: "question",
    targetId: id,
    details: { text: existing.text.slice(0, 100) },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  await notifyQuestionReviewed({
    subAdminEmail: existing.author?.email ?? "",
    subAdminName: existing.author?.name ?? "Sub-Admin",
    outcome: "published",
    context: { text: existing.text, subjectName: existing.subject.name },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}