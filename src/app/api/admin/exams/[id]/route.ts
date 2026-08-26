import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminActivity } from "@/lib/activity-logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      subject: true,
      author: { select: { id: true, name: true, email: true } },
      questions: {
        include: { question: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (admin.role !== "SUPER_ADMIN" && exam.createdBy !== admin.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    exam: {
      ...exam,
      questions: exam.questions.map((eq) => ({
        id: eq.question.id,
        text: eq.question.text,
        options: (() => { try { return JSON.parse(eq.question.options); } catch { return eq.question.options; } })(),
        correctAnswer: eq.question.correctAnswer,
        explanation: eq.question.explanation,
        difficulty: eq.question.difficulty,
        questionType: eq.question.questionType,
        marks: eq.question.marks,
        status: eq.question.status,
        order: eq.order,
      })),
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.exam.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (admin.role !== "SUPER_ADMIN" && existing.createdBy !== admin.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.description === "string") data.description = body.description.trim() || null;
  if (typeof body.timer === "number") data.timer = body.timer;
  if (typeof body.passingScore === "number") data.passingScore = body.passingScore;
  if (typeof body.totalMarks === "number") data.totalMarks = body.totalMarks;
  if (typeof body.status === "string") data.status = body.status;

  const updated = await prisma.exam.update({ where: { id }, data });

  // If questionIds provided, replace exam questions
  if (Array.isArray(body.questionIds)) {
    await prisma.examQuestion.deleteMany({ where: { examId: id } });
    await prisma.examQuestion.createMany({
      data: body.questionIds.map((questionId: string, index: number) => ({
        examId: id,
        questionId,
        order: index + 1,
      })),
    });
  }

  await logAdminActivity(admin.userId, "exam_edited", {
    targetType: "exam",
    targetId: id,
    details: { changes: Object.keys(data) },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true, exam: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.exam.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (admin.role !== "SUPER_ADMIN" && existing.createdBy !== admin.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.exam.delete({ where: { id } });

  await logAdminActivity(admin.userId, "exam_deleted", {
    targetType: "exam",
    targetId: id,
    details: { title: existing.title },
    ipAddress: _request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
