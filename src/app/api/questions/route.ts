import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

function isAdmin(session: Session | null): boolean {
  const role = session?.user?.role;
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const admin = isAdmin(session);

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");
    const difficulty = searchParams.get("difficulty");
    const status = admin ? searchParams.get("status") || "PUBLISHED" : "PUBLISHED";

    const where: Prisma.QuestionWhereInput = { status };

    if (subject) where.subject = { name: subject };
    if (difficulty) where.difficulty = difficulty;

    const questions = await prisma.question.findMany({
      where,
      include: {
        subject: true,
        topic: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (admin) {
      return NextResponse.json(questions);
    }

    const sanitized = questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options,
      difficulty: q.difficulty,
      tags: q.tags,
      year: q.year,
    }));

    return NextResponse.json(sanitized);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch questions" },
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

    const body = await request.json();
    const { text, options, correctAnswer, explanation, subjectId, topicId, difficulty, tags, year } = body;

    if (
      typeof text !== "string" ||
      !Array.isArray(options) ||
      typeof correctAnswer !== "number" ||
      correctAnswer < 0 ||
      correctAnswer >= options.length ||
      typeof subjectId !== "string"
    ) {
      return NextResponse.json(
        { error: "text, options, correctAnswer and subjectId are required" },
        { status: 400 }
      );
    }

    const question = await prisma.question.create({
      data: {
        text,
        options: JSON.stringify(options),
        correctAnswer,
        explanation,
        subjectId,
        topicId,
        difficulty: difficulty || "MEDIUM",
        tags: JSON.stringify(tags || []),
        year,
        status: "DRAFT",
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}
