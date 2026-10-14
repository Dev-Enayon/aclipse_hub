import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidSchoolTier, isValidExamType, SCHOOL_TIERS, EXAM_TYPES } from "@/lib/cbt";

export async function GET(request: NextRequest) {
  const tier = request.nextUrl.searchParams.get("tier");
  const type = request.nextUrl.searchParams.get("type");
  if (tier && !isValidSchoolTier(tier)) return NextResponse.json({ error: "Invalid tier." }, { status: 400 });
  if (type && !isValidExamType(type)) return NextResponse.json({ error: "Invalid exam type." }, { status: 400 });

  const cbts = await prisma.exam.findMany({
    where: {
      status: "PUBLISHED",
      ...(tier ? { schoolTier: tier } : {}),
      ...(type ? { examType: type } : {}),
    },
    include: {
      subject: { select: { name: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    cbts: cbts.map(({ id, title, description, schoolTier, examType, subject, timer, _count }) => ({
      id,
      title,
      description,
      schoolTier,
      examType,
      subject: subject.name,
      timer,
      questions: _count.questions,
    })),
    filters: { tiers: SCHOOL_TIERS, types: EXAM_TYPES },
  });
}