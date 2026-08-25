import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ attempts });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 64) : "";
  const examType = typeof body.examType === "string" ? body.examType.trim().slice(0, 32) : "";
  const total = Number(body.total);
  const score = Number(body.score);

  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }
  if (!Number.isInteger(total) || total < 1 || total > 120) {
    return NextResponse.json({ error: "Total must be between 1 and 120" }, { status: 400 });
  }
  if (!Number.isInteger(score) || score < 0 || score > total) {
    return NextResponse.json({ error: "Score must be between 0 and total" }, { status: 400 });
  }

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: session.user.id,
      subject,
      examType,
      total,
      score,
    },
  });

  // Log quiz_completed activity (fire-and-forget)
  prisma.activity
    .create({
      data: {
        userId: session.user.id,
        type: "quiz_completed",
        subject,
        details: JSON.stringify({ subject, examType, total, score }),
      },
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, id: attempt.id });
}
