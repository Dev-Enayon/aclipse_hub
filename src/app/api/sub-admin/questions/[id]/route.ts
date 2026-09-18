import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSubAdmin } from "@/lib/admin-auth";
import { canSubAdminEdit, validateObjectiveQuestion } from "@/lib/question-workflow";
import { logAdminActivity } from "@/lib/activity-logger";

/**
 * GET /api/sub-admin/questions/[id] — the Sub-Admin's own question.
 * PATCH — edit their own question only in DRAFT or REJECTED state (never silently
 *         changing status; the submit endpoint handles PENDING_REVIEW).
 * DELETE — remove their own question only in DRAFT or REJECTED state.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const subAdmin = await requireSubAdmin();
  if (!subAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question || question.createdBy !== subAdmin.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    question: {
      ...question,
      options: (() => { try { return JSON.parse(question.options); } catch { return question.options; } })(),
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const subAdmin = await requireSubAdmin();
  if (!subAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing || existing.createdBy !== subAdmin.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canSubAdminEdit(existing.status)) {
    return NextResponse.json(
      { error: `Questions in "${existing.status}" state cannot be edited. Submit a DRAFT or edit a REJECTED question only.` },
      { status: 409 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : existing.text;
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : existing.subjectId;
  const options = Array.isArray(body.options) ? body.options.filter((o) => typeof o === "string") : JSON.parse(existing.options as string);
  const correctAnswer = typeof body.correctAnswer === "number" ? body.correctAnswer : existing.correctAnswer;
  const explanation = typeof body.explanation === "string" ? body.explanation.trim() || null : existing.explanation;
  const difficulty = typeof body.difficulty === "string" ? body.difficulty : existing.difficulty;
  const year = typeof body.year === "number" ? body.year : existing.year;
  const topicId = typeof body.topicId === "string" ? body.topicId || null : existing.topicId;

  const errors = validateObjectiveQuestion({ text, subjectId, options, correctAnswer });
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const updated = await prisma.question.update({
    where: { id },
    data: {
      text,
      subjectId,
      topicId,
      options: JSON.stringify(options),
      correctAnswer,
      explanation,
      difficulty,
      year,
    },
  });

  await logAdminActivity(subAdmin.userId, "question_edited", {
    targetType: "question",
    targetId: id,
    details: { status: existing.status },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true, question: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const subAdmin = await requireSubAdmin();
  if (!subAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing || existing.createdBy !== subAdmin.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canSubAdminEdit(existing.status)) {
    return NextResponse.json(
      { error: `Questions in "${existing.status}" state cannot be deleted.` },
      { status: 409 }
    );
  }

  await prisma.question.delete({ where: { id } });

  await logAdminActivity(subAdmin.userId, "question_deleted", {
    targetType: "question",
    targetId: id,
    details: { text: existing.text.slice(0, 100) },
    ipAddress: _request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}