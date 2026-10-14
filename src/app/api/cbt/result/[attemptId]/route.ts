import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/cbt/result/[attemptId]?t=releaseToken
 * A result is visible only after the Head Admin releases it: either via the
 * private token emailed/in-app to the candidate, or by a logged-in student
 * viewing their own attempt.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const token = request.nextUrl.searchParams.get("t") ?? null;

  const attempt = await prisma.studentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        select: {
          title: true,
          subject: { select: { name: true } },
          schoolTier: true,
          examType: true,
        },
      },
      user: { select: { name: true } },
      results: true,
    },
  });
  if (!attempt) return NextResponse.json({ error: "Result not found." }, { status: 404 });

  const released = attempt.results.find((r) => r.releasedAt !== null);
  if (!released?.releasedAt) {
    return NextResponse.json({ error: "This result has not been released yet." }, { status: 403 });
  }

  const session = await auth();
  const ownAttempt = session?.user?.id && attempt.userId === session.user.id;
  const tokenValid = token && released.releaseToken && token === released.releaseToken;
  if (!ownAttempt && !tokenValid) {
    return NextResponse.json({ error: "Invalid release token." }, { status: 403 });
  }

  return NextResponse.json({
    result: {
      candidateName: attempt.studentName ?? attempt.user?.name ?? "Candidate",
      examTitle: attempt.exam?.title,
      subject: attempt.exam?.subject?.name,
      schoolTier: attempt.exam?.schoolTier,
      examType: attempt.exam?.examType,
      correctAnswers: released.correctAnswers,
      totalQuestions: released.totalQuestions,
      percentage: released.percentage,
      subjectBreakdown: typeof released.subjectBreakdown === "string" ? JSON.parse(released.subjectBreakdown) : released.subjectBreakdown,
      releasedAt: released.releasedAt,
    },
  });
}