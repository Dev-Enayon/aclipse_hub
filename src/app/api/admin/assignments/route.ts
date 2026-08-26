import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminActivity } from "@/lib/activity-logger";

/** GET: list all students with their assignment status (Head Admin only) */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const students = await prisma.student.findMany({
    select: {
      id: true,
      userId: true,
      surname: true,
      otherNames: true,
      classLevel: true,
      schoolLevel: true,
      department: true,
      profileCompleted: true,
      accountStatus: true,
      assignedAdminId: true,
      assignedAdmin: {
        select: { id: true, name: true, email: true },
      },
      user: { select: { name: true, email: true, createdAt: true } },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    students: students.map((s) => ({
      id: s.id,
      userId: s.userId,
      name: [s.surname, s.otherNames].filter(Boolean).join(" ") || s.user.name || s.user.email,
      email: s.user.email,
      classLevel: s.classLevel,
      schoolLevel: s.schoolLevel,
      department: s.department,
      profileCompleted: s.profileCompleted,
      accountStatus: s.accountStatus,
      assignedAdminId: s.assignedAdminId,
      assignedAdminName: s.assignedAdmin?.name ?? null,
      assignedAdminEmail: s.assignedAdmin?.email ?? null,
      enrolledAt: s.user.createdAt,
    })),
    admins: admins.map((a) => ({ id: a.id, name: a.name, email: a.email })),
  });
}

/** PATCH: assign/unassign students to sub-admins (Head Admin only) */
export async function PATCH(request: NextRequest) {
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

  const studentUserId = typeof body.studentUserId === "string" ? body.studentUserId : "";
  const adminId = typeof body.adminId === "string" ? body.adminId : null;

  if (!studentUserId) {
    return NextResponse.json({ error: "studentUserId is required" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { userId: studentUserId } });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (adminId) {
    const subAdmin = await prisma.user.findUnique({ where: { id: adminId, role: "ADMIN" } });
    if (!subAdmin) {
      return NextResponse.json({ error: "Sub-admin not found" }, { status: 404 });
    }
  }

  const previousAdminId = student.assignedAdminId;

  await prisma.student.update({
    where: { userId: studentUserId },
    data: { assignedAdminId: adminId || null },
  });

  const studentUser = await prisma.user.findUnique({ where: { id: studentUserId }, select: { name: true, email: true } });

  await logAdminActivity(admin.userId, adminId ? "student_assigned" : "student_unassigned", {
    targetType: "student",
    targetId: studentUserId,
    details: {
      studentName: studentUser?.name ?? studentUser?.email,
      previousAdminId,
      newAdminId: adminId,
    },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
