import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id, status: "PUBLISHED" },
    include: {
      subject: { select: { name: true } },
      _count: { select: { questions: true } },
    },
  });
  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    cbt: {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      schoolTier: exam.schoolTier,
      examType: exam.examType,
      subject: exam.subject.name,
      timer: exam.timer,
      passingScore: exam.passingScore,
      questions: exam._count.questions,
    },
  });
}