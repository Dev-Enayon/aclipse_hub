import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminActivity } from "@/lib/activity-logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({
    where: { id, role: "ADMIN" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      lastLoginAt: true,
      admin: { select: { permissions: true, department: true } },
      managedStudents: {
        select: {
          id: true,
          userId: true,
          surname: true,
          otherNames: true,
          classLevel: true,
          profileCompleted: true,
          accountStatus: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });

  if (!target) {
    return NextResponse.json({ error: "Sub-admin not found" }, { status: 404 });
  }

  return NextResponse.json({
    admin: {
      ...target,
      permissions: target.admin?.permissions ?? "[]",
      department: target.admin?.department ?? null,
      students: target.managedStudents.map((s) => ({
        id: s.id,
        userId: s.userId,
        name: [s.surname, s.otherNames].filter(Boolean).join(" ") || s.user.name || s.user.email,
        email: s.user.email,
        classLevel: s.classLevel,
        profileCompleted: s.profileCompleted,
        accountStatus: s.accountStatus,
      })),
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id, role: "ADMIN" } });
  if (!target) {
    return NextResponse.json({ error: "Sub-admin not found" }, { status: 404 });
  }

  const userData: Record<string, unknown> = {};
  if (typeof body.name === "string") userData.name = body.name.trim() || null;
  if (typeof body.department === "string") {
    await prisma.admin.upsert({
      where: { userId: id },
      update: { department: body.department.trim() || null },
      create: { userId: id, department: body.department.trim() || null, permissions: "[]" },
    });
  }
  if ("active" in body) {
    userData.accountStatus = body.active ? "ACTIVE" : "DEACTIVATED";
  }

  if (Object.keys(userData).length > 0) {
    await prisma.user.update({ where: { id }, data: userData });
  }

  await logAdminActivity(admin.userId, "sub_admin_edited", {
    targetType: "sub_admin",
    targetId: id,
    details: { changes: Object.keys(body) },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id, role: "ADMIN" } });
  if (!target) {
    return NextResponse.json({ error: "Sub-admin not found" }, { status: 404 });
  }

  // Unassign all students from this sub-admin
  await prisma.student.updateMany({ where: { assignedAdminId: id }, data: { assignedAdminId: null } });

  // Delete admin record then user
  await prisma.admin.delete({ where: { userId: id } }).catch(() => undefined);
  await prisma.user.delete({ where: { id } });

  await logAdminActivity(admin.userId, "sub_admin_deleted", {
    targetType: "sub_admin",
    targetId: id,
    details: { email: target.email },
    ipAddress: _request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
