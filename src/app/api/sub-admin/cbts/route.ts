import { NextRequest, NextResponse } from "next/server";
import { requireSubAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { isValidSchoolTier, isValidExamType } from "@/lib/cbt";
import { logAdminActivity } from "@/lib/activity-logger";

export async function GET() {
  const subAdmin = await requireSubAdmin();
  if (!subAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cbts = await prisma.exam.findMany({
    where: { createdBy: subAdmin.userId },
    include: {
      subject: { select: { name: true } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ cbts });
}

export async function POST(request: NextRequest) {
  const subAdmin = await requireSubAdmin();
  if (!subAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : null;
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : "";
  const schoolTier = typeof body.schoolTier === "string" ? body.schoolTier : null;
  const examType = typeof body.examType === "string" ? body.examType : "CBT";
  const timer = typeof body.timer === "number" ? Math.min(Math.max(Math.floor(body.timer), 5), 240) : 60;
  const questionIds = Array.isArray(body.questionIds) ? body.questionIds.filter((x): x is string => typeof x === "string") : [];

  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!subjectId) return NextResponse.json({ error: "A subject is required." }, { status: 400 });
  if (schoolTier && !isValidSchoolTier(schoolTier)) return NextResponse.json({ error: "Invalid school tier." }, { status: 400 });
  if (!isValidExamType(examType)) return NextResponse.json({ error: "Invalid exam type." }, { status: 400 });
  if (questionIds.length === 0) return NextResponse.json({ error: "Select at least one question." }, { status: 400 });
  if (questionIds.length > 200) return NextResponse.json({ error: "A CBT cannot exceed 200 questions." }, { status: 400 });

  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } });
  if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 400 });

  const ownQuestions = await prisma.question.findMany({
    where: { id: { in: questionIds }, createdBy: subAdmin.userId, status: { in: ["APPROVED", "PUBLISHED"] } },
    select: { id: true },
  });
  if (ownQuestions.length !== questionIds.length) {
    return NextResponse.json(
      { error: "All questions must be your own APPROVED questions." },
      { status: 400 }
    );
  }

  const exam = await prisma.exam.create({
    data: {
      title,
      description,
      subjectId,
      schoolTier,
      examType,
      timer,
      status: "DRAFT",
      createdBy: subAdmin.userId,
      questions: { create: questionIds.map((q, i) => ({ questionId: q, order: i + 1 })) },
    },
    include: { subject: { select: { name: true } }, _count: { select: { questions: true } } },
  });

  await logAdminActivity(subAdmin.userId, "exam_created", {
    targetType: "exam",
    targetId: exam.id,
    details: { title, schoolTier, examType, questionCount: questionIds.length },
  });

  return NextResponse.json({ ok: true, exam }, { status: 201 });
}