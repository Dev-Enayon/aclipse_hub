import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthRole = "VISITOR" | "STUDENT" | "ADMIN" | "SUB_ADMIN" | "SUPER_ADMIN";

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

/** Returns the current session if the user is SUPER_ADMIN (Head Admin), null otherwise. */
export async function requireHeadAdmin(): Promise<AdminSession | null> {
  const session = await auth();
  const role = session?.user?.role as AuthRole | undefined;
  if (!session?.user?.id || role !== "SUPER_ADMIN") return null;
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    role,
  };
}

/** Returns true if the current user is SUPER_ADMIN (Head Admin). */
export async function isHeadAdmin(): Promise<boolean> {
  return (await requireHeadAdmin()) !== null;
}

/**
 * Returns the current session if the user holds the SUB_ADMIN role and is not
 * suspended. Unlike the JWT, this re-checks the database on every call so a
 * role change or suspension takes effect immediately.
 */
export async function requireSubAdmin(): Promise<AdminSession | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      admin: { select: { status: true } },
    },
  });

  if (!user || user.role !== "SUB_ADMIN") return null;
  if (user.admin?.status !== "ACTIVE") return null;

  return {
    userId: user.id,
    email: user.email,
    name: user.name ?? null,
    role: "SUB_ADMIN",
  };
}