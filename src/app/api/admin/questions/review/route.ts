import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHeadAdmin } from "@/lib/admin-auth";

/** GET /api/admin/questions/review — questions pending Head Admin review. */
export async function GET() {
  if (!(await requireHeadAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const questions = await prisma.question.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      subject: { select: { id: true, name: true } },
      topic: { select: { id: true, name: true } },
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    questions: questions.map((q) => ({
      id: q.id,
      text: q.text,
      subjectId: q.subjectId,
      subjectName: q.subject.name,
      topicId: q.topicId,
      topicName: q.topic?.name ?? null,
      difficulty: q.difficulty,
      year: q.year,
      options: (() => { try { return JSON.parse(q.options); } catch { return q.options; } })(),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      author: q.author,
      createdAt: q.createdAt,
    })),
  });
}