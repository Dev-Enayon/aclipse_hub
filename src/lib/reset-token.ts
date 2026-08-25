import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/**
 * Creates a single-use password reset token for the user.
 * Returns the plaintext token (to be emailed); only its SHA-256 hash is stored.
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const plaintext = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(plaintext),
      userId,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return plaintext;
}

/** Returns the userId if the token is valid (exists, unexpired, unused); null otherwise. */
export async function validatePasswordResetToken(plaintext: string): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(plaintext) },
  });
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;
  return record.userId;
}

/** Marks a token as used. Single-use — subsequent calls are no-ops that return false. */
export async function consumePasswordResetToken(plaintext: string): Promise<boolean> {
  const result = await prisma.passwordResetToken.updateMany({
    where: {
      tokenHash: hashToken(plaintext),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  });
  return result.count === 1;
}
