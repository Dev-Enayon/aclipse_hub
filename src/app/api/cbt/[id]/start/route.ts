import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { claimEntryCode } from "@/lib/entry-codes";

/**
 * POST /api/cbt/[id]/start — { name, entryCode }
 * Claims a Head-Admin issued entry code and starts a CBT attempt for the
 * candidate. Optional: a logged-in STUDENT may also start with their own code
 * (their attempt is linked to their account for in-app result delivery).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: {
        include: { question: true },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!exam || exam.status !== "PUBLISHED") {
    return NextResponse.json({ error: "CBT not found or not yet released." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : "";
  const entryCode = typeof body.entryCode === "string" ? body.entryCode : "";

  const claim = await claimEntryCode({ code: entryCode, cbtId: exam.id, studentName: name });
  if (!claim.ok) return NextResponse.json({ error: claim.error }, { status: 400 });

  const session = await auth();
  const attempt = await prisma.studentAttempt.create({
    data: {
      userId: session?.user?.id ?? null,
      entryCodeId: claim.entryCodeId,
      studentName: name,
      examId: exam.id,
      answers: JSON.stringify(new Array(exam.questions.length).fill(null)),
      status: "IN_PROGRESS",
    },
    select: { id: true },
  });

  return NextResponse.json({
    ok: true,
    attemptId: attempt.id,
    timer: exam.timer,
    questions: exam.questions.map(({ question, order }) => ({
      id: question.id,
      order,
      text: question.text,
      options: JSON.parse(question.options),
      difficulty: question.difficulty,
    })),
  });
}