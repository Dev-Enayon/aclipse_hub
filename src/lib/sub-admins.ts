import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

export const ACTIVE_SUB_ADMIN_LIMIT = 6;

export const SUB_ADMIN_TEST_EMAIL_SUFFIX = "@aclipse.test";

export interface SubAdminView {
  id: string; // user id
  email: string;
  name: string;
  department: string | null;
  status: "ACTIVE" | "SUSPENDED";
  questionCount: number;
  createdAt: Date;
  lastLoginAt: Date | null;
}

/** Counts active Sub-Admins (role SUB_ADMIN with an ACTIVE admin record). */
export function activeSubAdminWhere(): Prisma.UserWhereInput {
  return { role: "SUB_ADMIN", admin: { status: "ACTIVE" } };
}

export async function countActiveSubAdmins(): Promise<number> {
  return prisma.user.count({ where: activeSubAdminWhere() });
}



export interface CreateSubAdminInput {
  name: string;
  email: string;
  password: string;
  department?: string;
}

export type CreateSubAdminResult =
  | { ok: true; user: { id: string; email: string; name: string | null } }
  | { ok: false; error: string };

function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("A valid email address is required.");
  }
  return trimmed;
}

/** Normalizes a JSONB function result, which may arrive as an object or a JSON string. */
function parseJsonbResult(rows: { result: unknown }[]): {
  ok: boolean;
  userId?: string;
  email?: string;
  name?: string | null;
  error?: string;
} | null {
  const raw = rows?.[0]?.result;
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ReturnType<typeof parseJsonbResult>;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && raw !== null) return raw as ReturnType<typeof parseJsonbResult>;
  return null;
}

/**
 * Creates a new Sub-Admin, enforcing the global maximum of 6 active
 * Sub-Admins atomically. The count + inserts run inside a single serialized
 * PostgreSQL function call. The FOR UPDATE row lock on the dedicated lock
 * table is server-global, so it stays race-safe under Neon's connection
 * pooler (advisory locks are not reliable there). A concurrent 7th creation
 * always fails.
 */
export async function createSubAdmin(input: CreateSubAdminInput): Promise<CreateSubAdminResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (typeof input.password !== "string" || input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  let email: string;
  try {
    email = normalizeEmail(input.email);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid email." };
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { ok: false, error: "A user with this email already exists." };
  }

  const userId = randomUUID();
  const adminId = randomUUID();
  const passwordHash = await hashPassword(input.password);
  const department = input.department?.trim() || null;

  try {
    const rows = await prisma.$queryRaw<{ result: unknown }[]>`
      SELECT create_sub_admin_atomically(
        ${userId}, ${adminId}, ${email}, ${name}, ${passwordHash}, ${department}::text, ${ACTIVE_SUB_ADMIN_LIMIT}::int
      ) AS result
    `;

    const result = parseJsonbResult(rows);
    if (!result || typeof result !== "object" || result.ok !== true) {
      return { ok: false, error: result?.error ?? `Only ${ACTIVE_SUB_ADMIN_LIMIT} active Sub-Admins are allowed.` };
    }
    return { ok: true, user: { id: result.userId as string, email, name } };
  } catch (e) {
    // Roll back any user row created without an admin row only if the admin
    // insert failed in a way that surfaced an error (the atomic function
    // normally never reaches here).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2010") {
      const rawCode = (e.meta as { code?: string } | undefined)?.code;
      if (rawCode === "23505") {
        return { ok: false, error: "A user with this email already exists." };
      }
    }
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    const message = e instanceof Error ? e.message : "Failed to create Sub-Admin.";
    return { ok: false, error: message };
  }
}

/** Lists all Sub-Admins with per-account question counts. */
export async function listSubAdmins(): Promise<SubAdminView[]> {
  const users = await prisma.user.findMany({
    where: { role: "SUB_ADMIN" },
    include: {
      admin: { select: { status: true, department: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name || u.email,
    department: u.admin?.department ?? null,
    status: (u.admin?.status ?? "SUSPENDED") as "ACTIVE" | "SUSPENDED",
    questionCount: u._count.questions,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }));
}

/** Pauses or resumes a Sub-Admin. Suspending frees a slot; reactivating enforces the 6-active cap atomically. */
export async function setSubAdminStatus(
  userId: string,
  status: "ACTIVE" | "SUSPENDED"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, admin: { select: { id: true, status: true } } },
  });
  if (!user || user.role !== "SUB_ADMIN") {
    return { ok: false, error: "Sub-Admin not found." };
  }
  if (!user.admin) {
    return { ok: false, error: "Sub-Admin has no account record." };
  }
  if (user.admin.status === status) {
    return { ok: true };
  }

  const rows = await prisma.$queryRaw<{ result: unknown }[]>`
    SELECT set_sub_admin_status_atomically(
      ${userId}, ${user.admin.id}, ${status}, ${ACTIVE_SUB_ADMIN_LIMIT}::int
    ) AS result
  `;

  const result = parseJsonbResult(rows);
  if (!result || result.ok !== true) {
    return { ok: false, error: result?.error ?? `Only ${ACTIVE_SUB_ADMIN_LIMIT} active Sub-Admins are allowed.` };
  }
  return { ok: true };
}

/** Updates a Sub-Admin's profile (name, department, optional password). */
export async function updateSubAdmin(
  userId: string,
  input: { name?: string; department?: string; password?: string }
): Promise<{ ok: true; user: { id: string; name: string } } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, admin: { select: { id: true, status: true } } },
  });
  if (!user || user.role !== "SUB_ADMIN") {
    return { ok: false, error: "Sub-Admin not found." };
  }
  if (!user.admin) {
    return { ok: false, error: "Sub-Admin has no account record." };
  }
  if (user.admin.status !== "ACTIVE" && input.password) {
    return { ok: false, error: "Suspended Sub-Admins cannot change their password." };
  }

  const userData: { name?: string; passwordHash?: string } = {};
  if (input.name?.trim()) userData.name = input.name.trim();
  if (typeof input.password === "string") {
    if (input.password.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters." };
    }
    userData.passwordHash = await hashPassword(input.password);
  }

  const adminData: { department?: string | null } = {};
  if (input.department !== undefined) {
    adminData.department = input.department.trim() || null;
  }

  const updated = await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: userData }),
    prisma.admin.update({ where: { id: user.admin.id }, data: adminData }),
  ]);

  return { ok: true, user: { id: updated[0].id, name: updated[0].name || updated[0].email } };
}