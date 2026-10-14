import { NextResponse } from "next/server";
import { requireHeadAdmin } from "@/lib/admin-auth";
import { releaseCbtResults } from "@/lib/cbt-results";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireHeadAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const exam = await prisma.exam.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!exam) return NextResponse.json({ error: "CBT not found." }, { status: 404 });
  if (exam.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Only published CBTs can release results." }, { status: 400 });
  }

  const outcome = await releaseCbtResults(id, admin.userId);
  return NextResponse.json({ ok: true, ...outcome });
}