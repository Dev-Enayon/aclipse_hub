import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activities = await prisma.activity.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ activities });
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

  const type = typeof body.type === "string" ? body.type.trim() : "";
  const allowedTypes = ["quiz_started", "quiz_completed", "profile_completed"];
  if (!allowedTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
  }

  const details: Record<string, unknown> = {};
  if (typeof body.subject === "string") details.subject = body.subject;
  if (typeof body.examType === "string") details.examType = body.examType;
  if (typeof body.total === "number") details.total = body.total;
  if (typeof body.score === "number") details.score = body.score;

  await prisma.activity.create({
    data: {
      userId: session.user.id,
      type,
      subject: typeof body.subject === "string" ? body.subject : null,
      details: JSON.stringify(details),
    },
  });

  return NextResponse.json({ ok: true });
}
