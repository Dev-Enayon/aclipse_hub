import { prisma } from "@/lib/prisma";
import { sendEmail, isMailConfigured } from "@/lib/mailer";

export type NotificationKind = "MESSAGE" | "RESULT_RELEASE" | "QUESTION_STATUS" | "SYSTEM";

export interface SendToUsersInput {
  subject: string;
  body: string;
  link?: string | null;
  kind?: NotificationKind;
  roleFilter?: { mustBeAdminActive?: boolean };
}

/** Which roles receive a broadcast. */
function rolesForRecipient(recipientRole: string): string[] {
  switch (recipientRole) {
    case "STUDENT":
      return ["STUDENT"];
    case "SUB_ADMIN":
      return ["SUB_ADMIN"];
    case "ADMIN":
      return ["ADMIN", "SUPER_ADMIN"];
    case "SUPER_ADMIN":
      return ["SUPER_ADMIN"];
    case "ALL_ADMINS":
      return ["ADMIN", "SUPER_ADMIN", "SUB_ADMIN"];
    default:
      return [];
  }
}

/**
 * Delivers an in-app notification to a set of users (optionally a whole role).
 * Always returns the count created. Email is attempted best-effort and never
 * blocks or throws — delivery depends on Resend being configured.
 */
export async function notifyUsers(
  recipients: { userId?: string | null; role: string; email?: string; name?: string | null }[],
  message: { subject: string; body: string; link?: string | null; kind?: NotificationKind }
): Promise<{ created: number; emailed: number }> {
  let created = 0;
  let emailed = 0;

  for (const r of recipients) {
    if (r.userId) {
      await prisma.notification.create({
        data: {
          recipientUserId: r.userId,
          recipientRole: r.role,
          kind: message.kind ?? "SYSTEM",
          subject: message.subject,
          body: message.body,
          link: message.link ?? null,
        },
      });
      created += 1;
    }

    if (r.email && isMailConfigured()) {
      const ok = await sendEmail({
        to: r.email,
        subject: message.subject,
        text: message.body,
        html: `<div style="font-family:sans-serif"><h2>${message.subject}</h2><p>${message.body.replace(/\n/g, "<br/>")}</p>${message.link ? `<p><a href="${message.link}">Open in Aclipse Hub</a></p>` : ""}</div>`,
      });
      if (ok) emailed += 1;
    }
  }

  return { created, emailed };
}

/** Broadcasts to every active user of a role. Inactive admins are excluded for admin roles. */
export async function notifyRole(
  role: string,
  message: { subject: string; body: string; link?: string | null; kind?: NotificationKind }
): Promise<{ created: number; emailed: number }> {
  const roles = rolesForRecipient(role);
  if (roles.length === 0) return { created: 0, emailed: 0 };

  const users = await prisma.user.findMany({
    where: {
      role: { in: roles },
      ...(roles.includes("SUB_ADMIN") || roles.includes("ADMIN") || roles.includes("SUPER_ADMIN")
        ? { admin: { status: "ACTIVE" } }
        : {}),
    },
    select: { id: true, role: true, email: true, name: true },
  });

  return notifyUsers(
    users.map((u) => ({
      userId: u.id,
      role: u.role,
      email: u.email,
      name: u.name,
    })),
    message
  );
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { recipientUserId: userId, readAt: null } });
}

export async function listNotificationsForUser(userId: string, take = 30) {
  return prisma.notification.findMany({
    where: { recipientUserId: userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<number> {
  const res = await prisma.notification.updateMany({
    where: {
      recipientUserId: userId,
      readAt: null,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
  return res.count;
}