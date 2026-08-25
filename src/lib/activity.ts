import { prisma } from "./prisma";

/**
 * Logs a student activity event. Fire-and-forget — errors are swallowed
 * so the caller is never blocked.
 */
export async function logActivity(
  userId: string,
  type: string,
  details: Record<string, unknown> = {}
) {
  try {
    await prisma.activity.create({
      data: {
        userId,
        type,
        subject: typeof details.subject === "string" ? details.subject : null,
        details: JSON.stringify(details),
      },
    });
  } catch {
    // non-critical — do not block the caller
  }
}
