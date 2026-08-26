import { prisma } from "./prisma";

/**
 * Logs an admin activity event. Fire-and-forget — errors are swallowed
 * so the caller is never blocked.
 */
export async function logAdminActivity(
  userId: string,
  action: string,
  options: {
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  } = {}
) {
  try {
    await prisma.adminActivityLog.create({
      data: {
        userId,
        action,
        targetType: options.targetType ?? null,
        targetId: options.targetId ?? null,
        details: JSON.stringify(options.details ?? {}),
        ipAddress: options.ipAddress ?? null,
      },
    });
  } catch {
    // non-critical — do not block the caller
  }
}
