import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminActivity } from "@/lib/activity-logger";

async function getQuestion(id: string) {
  return prisma.question.findUnique({
    where: { id },
    include: { subject: true, topic: true, author: { select: { id: true, name: true, email: true } } },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const question = await getQuestion(id);
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Sub-Admin can only view their own questions
  if (admin.role !== "SUPER_ADMIN" && question.createdBy !== admin.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    question: {
      ...question,
      options: (() => { try { return JSON.parse(question.options); } catch { return question.options; } })(),
      tags: (() => { try { return JSON.parse(question.tags); } catch { return question.tags; } })(),
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (admin.role !== "SUPER_ADMIN" && existing.createdBy !== admin.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  const strFields = ["text", "explanation", "difficulty", "questionType", "status"] as const;
  for (const f of strFields) {
    if (f in body) data[f] = typeof body[f] === "string" ? body[f].trim() : body[f];
  }
  if ("options" in body && Array.isArray(body.options)) data.options = JSON.stringify(body.options);
  if ("correctAnswer" in body) data.correctAnswer = body.correctAnswer;
  if ("marks" in body) data.marks = body.marks;
  if ("year" in body) data.year = body.year;
  if ("tags" in body && Array.isArray(body.tags)) data.tags = JSON.stringify(body.tags);
  if ("subjectId" in body) data.subjectId = body.subjectId;

  const updated = await prisma.question.update({ where: { id }, data });

  await logAdminActivity(admin.userId, "question_edited", {
    targetType: "question",
    targetId: id,
    details: { changes: Object.keys(data) },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true, question: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (admin.role !== "SUPER_ADMIN" && existing.createdBy !== admin.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.question.delete({ where: { id } });

  await logAdminActivity(admin.userId, "question_deleted", {
    targetType: "question",
    targetId: id,
    details: { text: existing.text.slice(0, 100) },
    ipAddress: _request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
