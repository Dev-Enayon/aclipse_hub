import { prisma } from "@/lib/prisma";
import { scoreExam, generateReleaseToken, type ScoredQuestion } from "@/lib/cbt";
import { notifyUsers } from "@/lib/app-notifications";

/**
 * Scores a completed CBT attempt server-side and persists the Result.
 * Answer keys are read from the database, never from the client.
 */
export async function persistCbtResult(params: {
  attemptId: string;
  answers: (number | null)[];
  email?: string;
  name?: string;
}): Promise<{ ok: boolean; resultId?: string; error?: string }> {
  const attempt = await prisma.studentAttempt.findUnique({
    where: { id: params.attemptId },
    include: {
      exam: {
        include: {
          questions: {
            include: { question: { include: { subject: { select: { name: true, id: true } } } } },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!attempt?.exam) return { ok: false, error: "Attempt or CBT not found." };
  if (!Array.isArray(params.answers) || params.answers.length !== attempt.exam.questions.length) {
    return { ok: false, error: "Invalid answer submission." };
  }

  const questions: ScoredQuestion[] = attempt.exam.questions.map((eq) => ({
    id: eq.question.id,
    correctAnswer: eq.question.correctAnswer,
    subjectId: eq.question.subjectId,
    subjectName: eq.question.subject.name,
  }));

  const scored = scoreExam(questions, params.answers);

  const result = await prisma.result.create({
    data: {
      attemptId: attempt.id,
      totalQuestions: scored.totalQuestions,
      correctAnswers: scored.correctAnswers,
      percentage: scored.percentage,
      subjectBreakdown: JSON.stringify(scored.subjectBreakdown),
    },
  });

  await prisma.studentAttempt.update({
    where: { id: attempt.id },
    data: { completedAt: new Date(), score: scored.correctAnswers, totalQuestions: scored.totalQuestions, status: "COMPLETED" },
  });

  return { ok: true, resultId: result.id };
}

/**
 * Head Admin releases results for a published CBT. Generates secret lookup
 * tokens and notifies each candidate (in-app for registered users, email for
 * entry-code candidates). Idempotent — already-released results are skipped.
 */
export async function releaseCbtResults(examId: string, actorId: string): Promise<{
  released: number;
  skipped: number;
  emailed: number;
}> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, title: true, schoolTier: true, examType: true },
  });
  if (!exam) throw new Error("CBT not found");

  const attempts = await prisma.studentAttempt.findMany({
    where: { examId, status: "COMPLETED" },
    include: {
      results: { where: { releasedAt: null }, take: 1 },
      user: { select: { id: true, email: true, name: true } },
      entryCode: { select: { code: true } },
    },
  });

  let released = 0;
  let skipped = 0;
  let emailed = 0;

  for (const attempt of attempts) {
    const pendingResult = attempt.results[0];
    if (!pendingResult) {
      skipped += 1;
      continue;
    }

    const token = generateReleaseToken();
    await prisma.result.update({
      where: { id: pendingResult.id },
      data: { releasedAt: new Date(), releaseToken: token },
    });
    released += 1;

    const candidateName = attempt.studentName ?? attempt.user?.name ?? "Candidate";
    const candidateEmail = attempt.user?.email ?? undefined;
    const link = `/cbt/result/${attempt.id}?t=${token}`;
    const subject = `Your ${exam.title} result has been released`;
    const body =
      `Dear ${candidateName}, your result for "${exam.title}" is now available. ` +
      `Score: ${pendingResult.correctAnswers}/${pendingResult.totalQuestions} ` +
      `(${pendingResult.percentage}%). Open the link to view your result page.`;

    const outcome = await notifyUsers(
      [{ userId: attempt.userId ?? null, role: "STUDENT", email: candidateEmail, name: candidateName }],
      { subject, body, link, kind: "RESULT_RELEASE" }
    );
    await prisma.adminActivityLog.create({
      data: {
        userId: actorId,
        action: "result_released",
        targetType: "exam",
        targetId: examId,
        details: JSON.stringify({ attemptId: attempt.id, candidate: candidateName }),
      },
    });
    emailed += outcome.emailed;
  }

  return { released, skipped, emailed };
}

export async function attemptsForCbt(examId: string) {
  return prisma.studentAttempt.findMany({
    where: { examId },
    include: {
      user: { select: { email: true, name: true } },
      entryCode: { select: { code: true } },
      results: { select: { correctAnswers: true, totalQuestions: true, percentage: true, releasedAt: true } },
    },
    orderBy: { startedAt: "desc" },
  });
}