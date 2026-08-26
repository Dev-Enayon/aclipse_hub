import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminActivity } from "@/lib/activity-logger";

const EXAM_TITLE = "Premium Access";
const TOTAL_SLOTS = 50;

/** Find or create the Premium Access exam for this admin */
async function ensurePremiumAccessExam(userId: string) {
  let exam = await prisma.exam.findFirst({
    where: { title: EXAM_TITLE, createdBy: userId },
  });
  if (exam) return exam;

  let subject = await prisma.subject.findFirst({ where: { name: "General" } });
  if (!subject) {
    subject = await prisma.subject.create({ data: { name: "General" } });
  }

  exam = await prisma.exam.create({
    data: {
      title: EXAM_TITLE,
      subjectId: subject.id,
      description: "Premium Access student questions",
      timer: 60,
      passingScore: 50,
      totalMarks: TOTAL_SLOTS,
      status: "PUBLISHED",
      createdBy: userId,
    },
  });
  return exam;
}

/** GET: return 50 slots for the Premium Access exam */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const exam = await ensurePremiumAccessExam(admin.userId);

  const examQuestions = await prisma.examQuestion.findMany({
    where: { examId: exam.id },
    include: { question: true },
    orderBy: { order: "asc" },
  });

  const slotMap = new Map<number, (typeof examQuestions)[number]>();
  for (const eq of examQuestions) {
    slotMap.set(eq.order, eq);
  }

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const order = i + 1;
    const eq = slotMap.get(order);
    if (!eq) return { slotNumber: order, question: null };

    const q = eq.question;
    return {
      slotNumber: order,
      question: {
        id: q.id,
        text: q.text,
        subjectId: q.subjectId,
        options: (() => {
          try { return JSON.parse(q.options); } catch { return q.options; }
        })(),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        questionType: q.questionType,
        marks: q.marks,
        status: q.status,
      },
    };
  });

  return NextResponse.json({ examId: exam.id, slots });
}

/** POST: create or update a question in a specific slot */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slotNumber = typeof body.slotNumber === "number" ? body.slotNumber : 0;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const subjectId = typeof body.subjectId === "string" ? body.subjectId.trim() : "";
  const options = Array.isArray(body.options) ? body.options : [];
  const correctAnswer = typeof body.correctAnswer === "number" ? body.correctAnswer : 0;
  const explanation = typeof body.explanation === "string" ? body.explanation.trim() : null;
  const difficulty = typeof body.difficulty === "string" ? body.difficulty : "MEDIUM";
  const questionType = typeof body.questionType === "string" ? body.questionType : "MCQ";
  const marks = typeof body.marks === "number" ? body.marks : 1;
  const status = typeof body.status === "string" ? body.status : "DRAFT";

  if (slotNumber < 1 || slotNumber > TOTAL_SLOTS) {
    return NextResponse.json({ error: "slotNumber must be 1-50" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }

  const exam = await ensurePremiumAccessExam(admin.userId);

  const existingEq = await prisma.examQuestion.findFirst({
    where: { examId: exam.id, order: slotNumber },
  });

  if (existingEq) {
    await prisma.question.update({
      where: { id: existingEq.questionId },
      data: {
        text,
        subjectId,
        options: JSON.stringify(options),
        correctAnswer,
        explanation,
        difficulty,
        questionType,
        marks,
        status,
      },
    });
  } else {
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
        status,
        createdBy: admin.userId,
      },
    });

    await prisma.examQuestion.create({
      data: {
        examId: exam.id,
        questionId: question.id,
        order: slotNumber,
      },
    });
  }

  await logAdminActivity(admin.userId, "premium_access_question_saved", {
    targetType: "premium_access_exam",
    targetId: exam.id,
    details: { slotNumber, text: text.slice(0, 100) },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}

/** DELETE: remove a question from a specific slot */
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slotNumber = typeof body.slotNumber === "number" ? body.slotNumber : 0;

  if (slotNumber < 1 || slotNumber > TOTAL_SLOTS) {
    return NextResponse.json({ error: "slotNumber must be 1-50" }, { status: 400 });
  }

  const exam = await ensurePremiumAccessExam(admin.userId);

  const existingEq = await prisma.examQuestion.findFirst({
    where: { examId: exam.id, order: slotNumber },
  });

  if (existingEq) {
    await prisma.examQuestion.delete({ where: { id: existingEq.id } });
  }

  await logAdminActivity(admin.userId, "premium_access_question_deleted", {
    targetType: "premium_access_exam",
    targetId: exam.id,
    details: { slotNumber },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
