import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { persistCbtResult } from "@/lib/cbt-results";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params;

  const attempt = await prisma.studentAttempt.findUnique({
    where: { id: attemptId },
    select: { examId: true, status: true },
  });
  if (!attempt || attempt.examId !== id) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "This attempt has already been submitted." }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const answers = Array.isArray(body?.answers) ? (body.answers as unknown[]) : null;
  if (!answers) return NextResponse.json({ error: "Answers are required." }, { status: 400 });
  if (answers.some((a) => a !== null && (typeof a !== "number" || !Number.isInteger(a) || a < 0))) {
    return NextResponse.json({ error: "Invalid answer format." }, { status: 400 });
  }

  const result = await persistCbtResult({ attemptId, answers: answers as (number | null)[] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    ok: true,
    resultId: result.resultId,
    message: "Your CBT has been submitted. Your result will be released by the Head Admin.",
  });
}