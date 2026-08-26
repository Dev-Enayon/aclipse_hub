import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthRole = "VISITOR" | "STUDENT" | "ADMIN" | "SUPER_ADMIN";

export interface AdminSession {
  userId: string;
  email: string;
  name: string | null;
  role: AuthRole;
}

/** Returns the current admin session if the user is ADMIN or SUPER_ADMIN, null otherwise. */
export async function requireAdmin(): Promise<AdminSession | null> {
  const session = await auth();
  const role = session?.user?.role as AuthRole | undefined;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) return null;
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    role,
  };
}

/** Returns true if the current user is ADMIN or SUPER_ADMIN. */
export async function isAdminRequest(): Promise<boolean> {
  return (await requireAdmin()) !== null;
}

/** Returns true if the current user is SUPER_ADMIN (Head Admin). */
export async function isHeadAdmin(): Promise<boolean> {
  const admin = await requireAdmin();
  return admin?.role === "SUPER_ADMIN";
}

/**
 * Checks that the current user has access to the given student.
 * SUPER_ADMIN always has access. ADMIN (Sub-Admin) only has access
 * to students where assignedAdminId matches their userId.
 */
export async function canAccessStudent(studentUserId: string): Promise<boolean> {
  const admin = await requireAdmin();
  if (!admin) return false;
  if (admin.role === "SUPER_ADMIN") return true;

  const student = await prisma.student.findUnique({
    where: { userId: studentUserId },
    select: { assignedAdminId: true },
  });
  return student?.assignedAdminId === admin.userId;
}

/**
 * Returns the WHERE clause to filter students by admin assignment.
 * SUPER_ADMIN sees all students. ADMIN (Sub-Admin) sees only assigned students.
 */
export async function studentWhereForAdmin(): Promise<Record<string, unknown>> {
  const admin = await requireAdmin();
  if (!admin) return { id: "__none__" };
  if (admin.role === "SUPER_ADMIN") return {};
  return { assignedAdminId: admin.userId };
}
