import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const ENTRY_CODE_STATUS = {
  UNUSED: "UNUSED",
  USED: "USED",
  REVOKED: "REVOKED",
} as const;
export type EntryCodeStatus = (typeof ENTRY_CODE_STATUS)[keyof typeof ENTRY_CODE_STATUS];

export interface EntryCodeInput {
  count: number;
  cbtId?: string | null;
  studentName?: string | null;
  prefix?: string | null;
}

export interface EntryCodeResult {
  ok: boolean;
  codes?: { id: string; code: string }[];
  error?: string;
}

const DEFAULT_PREFIX = "AHC";

/** Human-friendly code, e.g. AHC-K7QD-9X2L. Uses a non-ambiguous alphabet. */
function generateCode(prefix: string, seen: Set<string>): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    const bytes = randomBytes(8);
    code = Array.from(bytes)
      .map((b) => alphabet[b % alphabet.length])
      .join("")
      .slice(0, 8);
  } while (!/^[A-Z2-9]{8}$/.test(code) || seen.has(code));
  code = `${code.slice(0, 4)}-${code.slice(4)}`;
  seen.add(code);
  return `${prefix}-${code}`;
}

/**
 * Creates a batch of entry codes for the Head Admin. Codes are globally unique,
 * optionally bound to a specific CBT. Safe record-keeping only — no side effects.
 */
export async function createEntryCodes(
  actorId: string,
  input: EntryCodeInput
): Promise<EntryCodeResult> {
  const count = Math.floor(input.count);
  if (!Number.isFinite(count) || count < 1 || count > 1000) {
    return { ok: false, error: "Count must be between 1 and 1000." };
  }

  const prefix = (input.prefix ?? DEFAULT_PREFIX).trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const safePrefix = prefix || DEFAULT_PREFIX;

  if (input.cbtId) {
    const exam = await prisma.exam.findUnique({ where: { id: input.cbtId }, select: { id: true } });
    if (!exam) return { ok: false, error: "The selected CBT does not exist." };
  }

  const existing = await prisma.entryCode.findMany({ select: { code: true } });
  const seen = new Set(existing.map((e) => e.code));

  const rows = Array.from({ length: count }, () => ({
    code: generateCode(safePrefix, seen),
    cbtId: input.cbtId || null,
    studentName: input.studentName?.trim() || null,
    createdBy: actorId,
  }));

  const created = await prisma.entryCode.createMany({ data: rows });
  // createMany does not return ids on Postgres via Prisma; fetch them back.
  const saved = await prisma.entryCode.findMany({
    where: { code: { in: rows.map((r) => r.code) } },
    select: { id: true, code: true },
  });

  if (created.count !== saved.length) {
    return { ok: false, error: "Some codes could not be persisted. Please retry." };
  }

  return { ok: true, codes: saved };
}

/**
 * Claims an entry code for a candidate. The code must exist, be UNUSED, and
 * (when the CBT requires binding) match the CBT. Consumes it atomically and
 * records the candidate name. Returns the claimed code or an error.
 */
export async function claimEntryCode(params: {
  code: string;
  cbtId: string;
  studentName: string;
}): Promise<{ ok: true; entryCodeId: string } | { ok: false; error: string }> {
  const trimmed = params.code.trim().toUpperCase();
  const name = params.studentName.trim();
  if (!trimmed) return { ok: false, error: "Entry code is required." };
  if (!name) return { ok: false, error: "Name is required." };
  if (name.length > 120) return { ok: false, error: "Name is too long." };

  const entry = await prisma.entryCode.findUnique({ where: { code: trimmed } });
  if (!entry) return { ok: false, error: "Invalid entry code." };

  if (entry.cbtId && entry.cbtId !== params.cbtId) {
    return { ok: false, error: "This entry code is not valid for the selected CBT." };
  }
  if (entry.status === "USED") {
    return { ok: false, error: "This entry code has already been used." };
  }
  if (entry.status === "REVOKED") {
    return { ok: false, error: "This entry code has been revoked." };
  }

  const claimed = await prisma.entryCode.updateMany({
    where: { id: entry.id, status: "UNUSED" },
    data: { status: "USED", usedBy: name, usedAt: new Date() },
  });
  if (claimed.count !== 1) {
    return { ok: false, error: "This entry code has already been used." };
  }

  return { ok: true, entryCodeId: entry.id };
}

export async function listEntryCodes(options?: { cbtId?: string; status?: string }) {
  return prisma.entryCode.findMany({
    where: {
      ...(options?.cbtId ? { cbtId: options.cbtId } : {}),
      ...(options?.status ? { status: options.status } : {}),
    },
    include: {
      cbt: { select: { id: true, title: true, schoolTier: true, examType: true } },
      creator: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeEntryCode(id: string) {
  const res = await prisma.entryCode.updateMany({
    where: { id, status: "UNUSED" },
    data: { status: "REVOKED" },
  });
  return res.count === 1;
}