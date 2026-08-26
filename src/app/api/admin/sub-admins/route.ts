import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminActivity } from "@/lib/activity-logger";
import { hashPassword } from "@/lib/password";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      lastLoginAt: true,
      lastActiveAt: true,
      admin: { select: { permissions: true, department: true } },
      managedStudents: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    admins: admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      department: a.admin?.department ?? null,
      permissions: a.admin?.permissions ?? "[]",
      studentCount: a.managedStudents.length,
      createdAt: a.createdAt,
      lastLoginAt: a.lastLoginAt,
      lastActiveAt: a.lastActiveAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const department = typeof body.department === "string" ? body.department.trim() : null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const newAdmin = await prisma.user.create({
    data: {
      email,
      name: name || null,
      passwordHash,
      role: "ADMIN",
      provider: "credentials",
      admin: {
        create: {
          permissions: JSON.stringify(["manage_students", "manage_questions", "manage_exams"]),
          department,
        },
      },
    },
    select: { id: true, name: true, email: true },
  });

  await logAdminActivity(admin.userId, "sub_admin_created", {
    targetType: "sub_admin",
    targetId: newAdmin.id,
    details: { name: newAdmin.name, email: newAdmin.email },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true, admin: newAdmin }, { status: 201 });
}
