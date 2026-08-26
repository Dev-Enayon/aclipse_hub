import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminActivity } from "@/lib/activity-logger";

/** GET: list questions — Sub-Admin sees own, Head Admin sees all */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId");
  const status = searchParams.get("status");
  const examId = searchParams.get("examId");

  const where: Record<string, unknown> = {};
  // Sub-Admin only sees their own questions
  if (admin.role !== "SUPER_ADMIN") {
    where.createdBy = admin.userId;
  }
  if (subjectId) where.subjectId = subjectId;
  if (status) where.status = status;

  // If filtering by exam, get question IDs from ExamQuestion
  if (examId) {
    const eq = await prisma.examQuestion.findMany({
      where: { examId },
      select: { questionId: true },
      orderBy: { order: "asc" },
    });
    where.id = { in: eq.map((e) => e.questionId) };
  }

  const questions = await prisma.question.findMany({
    where,
    include: { subject: true, topic: true, author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    questions: questions.map((q) => ({
      ...q,
      options: (() => { try { return JSON.parse(q.options); } catch { return q.options; } })(),
      tags: (() => { try { return JSON.parse(q.tags); } catch { return q.tags; } })(),
    })),
  });
}

/** POST: create a question */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : "";
  const options = Array.isArray(body.options) ? body.options : [];
  const correctAnswer = typeof body.correctAnswer === "number" ? body.correctAnswer : 0;
  const explanation = typeof body.explanation === "string" ? body.explanation.trim() : null;
  const difficulty = typeof body.difficulty === "string" ? body.difficulty : "MEDIUM";
  const questionType = typeof body.questionType === "string" ? body.questionType : "MCQ";
  const marks = typeof body.marks === "number" ? body.marks : 1;
  const year = typeof body.year === "number" ? body.year : null;
  const tags = Array.isArray(body.tags) ? body.tags : [];
  const status = typeof body.status === "string" ? body.status : "DRAFT";

  if (!text || !subjectId) {
    return NextResponse.json({ error: "text and subjectId are required" }, { status: 400 });
  }

  const question = await prisma.question.create({
    data: {
      text,
      subjectId,
      options: JSON.stringify(options),
      correctAnswer,
      explanation,
      difficulty,
      questionType,
      marks,
      year,
      tags: JSON.stringify(tags),
      status,
      createdBy: admin.userId,
    },
  });

  await logAdminActivity(admin.userId, "question_created", {
    targetType: "question",
    targetId: question.id,
    details: { text: text.slice(0, 100), subjectId, status },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true, question }, { status: 201 });
}
