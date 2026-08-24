import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

function isAdmin(session: Session | null): boolean {
  const role = session?.user?.role;
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET() {
  try {
    const session = await auth();
    const admin = isAdmin(session);

    const exams = await prisma.exam.findMany({
      where: { status: "PUBLISHED" },
      include: {
        subject: true,
        questions: {
          include: { question: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (admin) {
      return NextResponse.json(exams);
    }

    const sanitized = exams.map((exam) => ({
      ...exam,
      questions: exam.questions.map(({ question, ...eq }) => ({
        ...eq,
        question: {
          id: question.id,
          text: question.text,
          options: question.options,
          difficulty: question.difficulty,
          tags: question.tags,
          year: question.year,
        },
      })),
    }));

    return NextResponse.json(sanitized);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch exams" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const createdBy = session?.user?.id;

    const body = await request.json();
    const { title, description, subjectId, timer, passingScore, questionIds } = body;

    if (
      typeof title !== "string" ||
      typeof subjectId !== "string" ||
      !Array.isArray(questionIds)
    ) {
      return NextResponse.json(
        { error: "title, subjectId and questionIds are required" },
        { status: 400 }
      );
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        description,
        subjectId,
        timer: timer || 60,
        passingScore: passingScore || 50,
        status: "DRAFT",
        createdBy,
        questions: {
          create: questionIds?.map((questionId: string, index: number) => ({
            questionId,
            order: index + 1,
          })) || [],
        },
      },
      include: {
        subject: true,
        questions: true,
      },
    });

    return NextResponse.json(exam, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create exam" },
      { status: 500 }
    );
  }
}
