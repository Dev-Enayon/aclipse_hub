import { NextRequest, NextResponse } from "next/server";
import { requireSubAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { isValidSchoolTier, isValidExamType } from "@/lib/cbt";
import { logAdminActivity } from "@/lib/activity-logger";

const EDITABLE_STATUSES = ["DRAFT", "REJECTED"];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const subAdmin = await requireSubAdmin();
  if (!subAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true, id: true } },
      questions: {
        include: { question: { select: { id: true, text: true, subjectId: true, schoolTier: true, examType: true, difficulty: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!exam || exam.createdBy !== subAdmin.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ exam });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const subAdmin = await requireSubAdmin();
  if (!subAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.exam.findUnique({ where: { id } });
  if (!existing || existing.createdBy !== subAdmin.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!EDITABLE_STATUSES.includes(existing.status)) {
    return NextResponse.json(
      { error: `A CBT in "${existing.status}" state cannot be edited.` },
      { status: 409 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Submit-for-review action.
  if (body?.status === "PENDING_REVIEW") {
    const count = await prisma.examQuestion.count({ where: { examId: id } });
    if (count === 0) return NextResponse.json({ error: "Add questions before submitting." }, { status: 400 });
    const updated = await prisma.exam.update({
      where: { id },
      data: { status: "PENDING_REVIEW", reviewFeedback: null },
    });
    await logAdminActivity(subAdmin.userId, "exam_submitted", {
      targetType: "exam",
      targetId: id,
      details: { title: existing.title, questionCount: count },
    });
    return NextResponse.json({ ok: true, status: updated.status });
  }

  // Field updates (only DRAFT/REJECTED here).
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : existing.title;
  const description = typeof body.description === "string" ? body.description.trim() : existing.description;
  const schoolTier = typeof body.schoolTier === "string" ? body.schoolTier : existing.schoolTier;
  const examType = typeof body.examType === "string" ? body.examType : existing.examType;
  const timer = typeof body.timer === "number" ? Math.min(Math.max(Math.floor(body.timer), 5), 240) : existing.timer;
  const questionIds = Array.isArray(body.questionIds)
    ? body.questionIds.filter((x): x is string => typeof x === "string")
    : null;

  if (schoolTier && !isValidSchoolTier(schoolTier)) return NextResponse.json({ error: "Invalid school tier." }, { status: 400 });
  if (!isValidExamType(examType)) return NextResponse.json({ error: "Invalid exam type." }, { status: 400 });

  if (questionIds) {
    if (questionIds.length === 0) return NextResponse.json({ error: "Select at least one question." }, { status: 400 });
    if (questionIds.length > 200) return NextResponse.json({ error: "A CBT cannot exceed 200 questions." }, { status: 400 });
    const ownQuestions = await prisma.question.findMany({
      where: { id: { in: questionIds }, createdBy: subAdmin.userId, status: { in: ["APPROVED", "PUBLISHED"] } },
      select: { id: true },
    });
    if (ownQuestions.length !== questionIds.length) {
      return NextResponse.json({ error: "All questions must be your own APPROVED questions." }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.examQuestion.deleteMany({ where: { examId: id } }),
      prisma.examQuestion.createMany({
        data: questionIds.map((q, i) => ({ examId: id, questionId: q, order: i + 1 })),
      }),
    ]);
  }

  const updated = await prisma.exam.update({
    where: { id },
    data: {
      title,
      description,
      schoolTier,
      examType,
      timer,
      // Editing a rejected CBT resets it to DRAFT for re-submission.
      ...(existing.status === "REJECTED" ? { status: "DRAFT", reviewFeedback: null } : {}),
    },
  });
  await logAdminActivity(subAdmin.userId, "exam_edited", {
    targetType: "exam",
    targetId: id,
    details: { title },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const subAdmin = await requireSubAdmin();
  if (!subAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.exam.findUnique({ where: { id } });
  if (!existing || existing.createdBy !== subAdmin.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!EDITABLE_STATUSES.includes(existing.status)) {
    return NextResponse.json(
      { error: `A CBT in "${existing.status}" state cannot be deleted.` },
      { status: 409 }
    );
  }

  await prisma.exam.delete({ where: { id } });
  await logAdminActivity(subAdmin.userId, "exam_deleted", {
    targetType: "exam",
    targetId: id,
    details: { title: existing.title },
  });
  return NextResponse.json({ ok: true });
}