import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSubAdmin } from "@/lib/admin-auth";
import { validateObjectiveQuestion } from "@/lib/question-workflow";
import { logAdminActivity } from "@/lib/activity-logger";

function parseOptions(raw: string): string[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** GET /api/sub-admin/questions — list the Sub-Admin's own questions. */
export async function GET(request: NextRequest) {
  const subAdmin = await requireSubAdmin();
  if (!subAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const subjectId = searchParams.get("subjectId");

  const where: Record<string, unknown> = { createdBy: subAdmin.userId };
  if (status) where.status = status;
  if (subjectId) where.subjectId = subjectId;

  const questions = await prisma.question.findMany({
    where,
    include: {
      subject: { select: { id: true, name: true } },
      topic: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    questions: questions.map((q) => ({
      id: q.id,
      text: q.text,
      subjectId: q.subjectId,
      subjectName: q.subject.name,
      topicId: q.topicId,
      topicName: q.topic?.name ?? null,
      questionType: q.questionType,
      difficulty: q.difficulty,
      marks: q.marks,
      options: parseOptions(q.options),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      year: q.year,
      status: q.status,
      reviewFeedback: q.reviewFeedback,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    })),
  });
}

/** POST /api/sub-admin/questions — create an objective question as a DRAFT. A Sub-Admin can never publish. */
export async function POST(request: NextRequest) {
  const subAdmin = await requireSubAdmin();
  if (!subAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : "";
  const options = Array.isArray(body.options) ? body.options.filter((o) => typeof o === "string") : [];
  const correctAnswer = body.correctAnswer;
  const explanation = typeof body.explanation === "string" ? body.explanation.trim() || null : null;
  const difficulty = typeof body.difficulty === "string" ? body.difficulty : "MEDIUM";
  const year = typeof body.year === "number" ? body.year : null;
  const topicId = typeof body.topicId === "string" && body.topicId ? body.topicId : null;

  const errors = validateObjectiveQuestion({ text, subjectId, options, correctAnswer });
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } });
  if (!subject) {
    return NextResponse.json({ error: "Subject not found." }, { status: 400 });
  }

  const question = await prisma.question.create({
    data: {
      text,
      subjectId,
      topicId,
      options: JSON.stringify(options),
      correctAnswer: correctAnswer as number,
      explanation,
      difficulty,
      questionType: "MCQ",
      marks: 1,
      year,
      status: "DRAFT",
      createdBy: subAdmin.userId,
    },
  });

  await logAdminActivity(subAdmin.userId, "question_created", {
    targetType: "question",
    targetId: question.id,
    details: { text: text.slice(0, 100), subjectId, status: "DRAFT" },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true, questionId: question.id }, { status: 201 });
}