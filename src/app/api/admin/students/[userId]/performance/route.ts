import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, canAccessStudent } from "@/lib/admin-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;

  if (admin.role !== "SUPER_ADMIN") {
    const allowed = await canAccessStudent(userId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const [quizAttempts, studentAttempts] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.studentAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      include: {
        exam: { select: { title: true, subject: { select: { name: true } } } },
        quiz: { select: { title: true, subject: { select: { name: true } } } },
      },
    }),
  ]);

  const quizMapped = quizAttempts.map((a) => ({
    type: "Quiz" as const,
    subject: a.subject,
    score: a.score,
    total: a.total,
    percentage: a.total > 0 ? (a.score / a.total) * 100 : 0,
    date: a.createdAt,
    id: a.id,
  }));

  const studentMapped = studentAttempts.map((a) => {
    const subjectName =
      a.exam?.subject?.name ?? a.quiz?.subject?.name ?? "General";
    return {
      type: "Exam" as const,
      subject: subjectName,
      score: a.score ?? 0,
      total: a.totalQuestions ?? 0,
      percentage:
        a.totalQuestions && a.totalQuestions > 0
          ? ((a.score ?? 0) / a.totalQuestions) * 100
          : 0,
      date: a.startedAt,
      id: a.id,
    };
  });

  const allAttempts = [...quizMapped, ...studentMapped].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalAttempts = allAttempts.length;
  const averageScore =
    totalAttempts > 0
      ? allAttempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts
      : 0;

  const subjectsAttempted = [
    ...new Set(allAttempts.map((a) => a.subject)),
  ];

  const subjectMap: Record<
    string,
    { attempts: number; totalPercentage: number }
  > = {};
  for (const a of allAttempts) {
    if (!subjectMap[a.subject]) {
      subjectMap[a.subject] = { attempts: 0, totalPercentage: 0 };
    }
    subjectMap[a.subject].attempts++;
    subjectMap[a.subject].totalPercentage += a.percentage;
  }

  const subjectPerformance = Object.entries(subjectMap)
    .map(([subject, data]) => ({
      subject,
      attempts: data.attempts,
      averageScore:
        data.attempts > 0 ? data.totalPercentage / data.attempts : 0,
    }))
    .sort((a, b) => b.attempts - a.attempts);

  const recentAttempts = allAttempts.slice(0, 10).map((a) => ({
    id: a.id,
    type: a.type,
    subject: a.subject,
    score: a.score,
    total: a.total,
    percentage: Math.round(a.percentage * 10) / 10,
    date: a.date,
  }));

  return NextResponse.json({
    student: { id: user.id, name: user.name, email: user.email },
    stats: {
      totalAttempts,
      averageScore: Math.round(averageScore * 10) / 10,
      subjectsAttempted: subjectsAttempted.length,
    },
    recentAttempts,
    subjectPerformance: subjectPerformance.map((s) => ({
      ...s,
      averageScore: Math.round(s.averageScore * 10) / 10,
    })),
  });
}
