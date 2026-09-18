import { auth } from "@/lib/auth";

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


