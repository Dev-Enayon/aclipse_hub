import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminActivity } from "@/lib/activity-logger";

/** GET: list exams — Sub-Admin sees own, Head Admin sees all */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const subjectId = searchParams.get("subjectId");

  const where: Record<string, unknown> = {};
  if (admin.role !== "SUPER_ADMIN") where.createdBy = admin.userId;
  if (status) where.status = status;
  if (subjectId) where.subjectId = subjectId;

  const exams = await prisma.exam.findMany({
    where,
    include: {
      subject: true,
      author: { select: { id: true, name: true, email: true } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    exams: exams.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      subjectId: e.subjectId,
      subjectName: e.subject.name,
      timer: e.timer,
      passingScore: e.passingScore,
      totalMarks: e.totalMarks,
      status: e.status,
      createdBy: e.createdBy,
      authorName: e.author?.name ?? null,
      authorEmail: e.author?.email ?? null,
      questionCount: e._count.questions,
      attemptCount: e._count.attempts,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
  });
}

/** POST: create an exam */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : "";
  const description = typeof body.description === "string" ? body.description.trim() : null;
  const timer = typeof body.timer === "number" ? body.timer : 60;
  const passingScore = typeof body.passingScore === "number" ? body.passingScore : 50;
  const totalMarks = typeof body.totalMarks === "number" ? body.totalMarks : 60;
  const questionIds = Array.isArray(body.questionIds) ? body.questionIds : [];

  if (!title || !subjectId) {
    return NextResponse.json({ error: "title and subjectId are required" }, { status: 400 });
  }

  const exam = await prisma.exam.create({
    data: {
      title,
      subjectId,
      description,
      timer,
      passingScore,
      totalMarks,
      status: "DRAFT",
      createdBy: admin.userId,
      questions: {
        create: questionIds.map((questionId: string, index: number) => ({
          questionId,
          order: index + 1,
        })),
      },
    },
    include: { subject: true, questions: true },
  });

  await logAdminActivity(admin.userId, "exam_created", {
    targetType: "exam",
    targetId: exam.id,
    details: { title, subjectId, questionCount: questionIds.length },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true, exam }, { status: 201 });
}
