import { prisma } from "@/lib/prisma";

export interface SubAdminReportRow {
  userId: string;
  name: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED";
  total: number;
  draft: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  published: number;
  other: number;
  approvalRate: number | null; // approved / submitted-for-review, percentage or null
  lastLoginAt: Date | null;
}

export interface SubjectReportRow {
  subjectId: string;
  subjectName: string;
  total: number;
  published: number;
}

export interface QuestionStatusTotals {
  [status: string]: number;
}

export interface HeadAdminReport {
  generatedAt: string;
  totals: {
    students: number;
    subAdmins: number;
    activeSubAdmins: number;
    questions: number;
  };
  questionsByStatus: QuestionStatusTotals;
  perSubAdmin: SubAdminReportRow[];
  perSubject: SubjectReportRow[];
  recentSubmissions: {
    id: string;
    text: string;
    subjectName: string;
    authorName: string | null;
    createdAt: Date;
  }[];
}

/** Builds the Head Admin report: student totals, question health, per Sub-Admin and per subject breakdowns. */
export async function getHeadAdminReport(): Promise<HeadAdminReport> {
  const [
    studentCount,
    subAdminUsers,
    activeSubAdminCount,
    questionCount,
    statusGroups,
    subjectGroups,
    recentSubmissions,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.user.findMany({
      where: { role: "SUB_ADMIN" },
      select: {
        id: true,
        name: true,
        email: true,
        lastLoginAt: true,
        admin: { select: { status: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.count({ where: { role: "SUB_ADMIN", admin: { status: "ACTIVE" } } }),
    prisma.question.count(),
    prisma.question.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.question.groupBy({ by: ["subjectId"], _count: { _all: true } }),
    prisma.question.findMany({
      where: { status: "PENDING_REVIEW" },
      select: {
        id: true,
        text: true,
        createdAt: true,
        subject: { select: { name: true } },
        author: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const subjectNames = new Map<string, string>();
  if (subjectGroups.length > 0) {
    const subjects = await prisma.subject.findMany({
      where: { id: { in: subjectGroups.map((g) => g.subjectId) } },
      select: { id: true, name: true },
    });
    for (const s of subjects) subjectNames.set(s.id, s.name);
  }

  const perSubject = subjectGroups
    .map((g) => ({ subjectId: g.subjectId, total: g._count._all }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)
    .map(({ subjectId, total }) => ({
      subjectId,
      subjectName: subjectNames.get(subjectId) ?? "Unknown",
      total,
      published: 0,
    }));

  await Promise.all(
    perSubject.map(async (row) => {
      const count = await prisma.question.count({
        where: { subjectId: row.subjectId, status: "PUBLISHED" },
      });
      row.published = count;
    })
  );

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      students: studentCount,
      subAdmins: subAdminUsers.length,
      activeSubAdmins: activeSubAdminCount,
      questions: questionCount,
    },
    questionsByStatus: Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])),
    perSubAdmin: subAdminUsers.map((u) => {
      return {
        userId: u.id,
        name: u.name || u.email,
        email: u.email,
        status: (u.admin?.status ?? "SUSPENDED") as "ACTIVE" | "SUSPENDED",
        total: u._count.questions,
        draft: 0,
        pendingReview: 0,
        approved: 0,
        rejected: 0,
        published: 0,
        other: 0,
        approvalRate: null,
        lastLoginAt: u.lastLoginAt,
      };
    }),
    perSubject,
    recentSubmissions: recentSubmissions.map((q) => ({
      id: q.id,
      text: q.text,
      subjectName: q.subject.name,
      authorName: q.author?.name ?? null,
      createdAt: q.createdAt,
    })),
  };
}

/** Fills per-Sub-Admin status breakdowns in one pass (avoids N+1 for the report). */
export async function withSubAdminStatusBreakdown(report: HeadAdminReport): Promise<HeadAdminReport> {
  if (report.perSubAdmin.length === 0) return report;

  const groups = await prisma.question.groupBy({
    by: ["createdBy", "status"],
    where: { createdBy: { in: report.perSubAdmin.map((r) => r.userId) } },
    _count: { _all: true },
  });

  const countFor = (userId: string, status: string) =>
    groups.find((g) => g.createdBy === userId && g.status === status)?._count._all ?? 0;

  for (const row of report.perSubAdmin) {
    row.draft = countFor(row.userId, "DRAFT");
    row.pendingReview = countFor(row.userId, "PENDING_REVIEW");
    row.approved = countFor(row.userId, "APPROVED");
    row.rejected = countFor(row.userId, "REJECTED");
    row.published = countFor(row.userId, "PUBLISHED");
    row.other = countFor(row.userId, "ARCHIVED");
    const submitted = row.approved + row.rejected + row.pendingReview + row.published;
    row.approvalRate =
      submitted > 0 ? Math.round((row.approved / submitted) * 1000) / 10 : null;
  }

  return report;
}