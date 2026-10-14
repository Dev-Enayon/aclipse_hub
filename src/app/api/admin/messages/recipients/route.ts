import { NextResponse } from "next/server";
import { requireHeadAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireHeadAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const subAdmins = await prisma.user.findMany({
    where: { role: "SUB_ADMIN", admin: { status: "ACTIVE" } },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      admin: { select: { department: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    subAdmins: subAdmins.map((s) => ({ id: s.id, name: s.name, email: s.email, department: s.admin?.department ?? null, createdAt: s.createdAt })),
    students,
  });
}