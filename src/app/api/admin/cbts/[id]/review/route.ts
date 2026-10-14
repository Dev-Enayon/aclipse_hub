import { NextRequest, NextResponse } from "next/server";
import { requireHeadAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/app-notifications";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireHeadAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }
  const feedback = typeof body?.feedback === "string" ? body.feedback.trim().slice(0, 1000) : null;

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { author: { select: { id: true, email: true, name: true } } },
  });
  if (!exam) return NextResponse.json({ error: "CBT not found." }, { status: 404 });
  if (exam.status !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "Only CBTs pending review can be reviewed." }, { status: 409 });
  }
  if (action === "reject" && !feedback) {
    return NextResponse.json({ error: "Feedback is required when rejecting a CBT." }, { status: 400 });
  }

  const updated = await prisma.exam.update({
    where: { id },
    data: {
      status: action === "approve" ? "PUBLISHED" : "REJECTED",
      reviewFeedback: feedback,
      reviewedBy: admin.userId,
      reviewedAt: new Date(),
    },
  });

  await prisma.adminActivityLog.create({
    data: {
      userId: admin.userId,
      action: action === "approve" ? "exam_published" : "exam_rejected",
      targetType: "exam",
      targetId: id,
      details: JSON.stringify({ title: exam.title, author: exam.author?.email ?? null, feedback }),
    },
  });

  if (exam.author) {
    const subject = action === "approve" ? `Your CBT "${exam.title}" is live` : `Your CBT "${exam.title}" needs changes`;
    const body =
      action === "approve"
        ? `Congratulations ${exam.author.name ?? "Sub-Admin"}, "${exam.title}" was approved and is now available to students.`
        : `"${exam.title}" was rejected. Reviewer feedback: ${feedback}`;
    await notifyUsers(
      [{ userId: exam.author.id, role: "SUB_ADMIN", email: exam.author.email, name: exam.author.name }],
      { subject, body, link: `/sub-admin/cbts/${id}`, kind: "QUESTION_STATUS" }
    );
  }

  return NextResponse.json({ ok: true, status: updated.status });
}