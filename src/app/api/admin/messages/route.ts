import { NextRequest, NextResponse } from "next/server";
import { requireHeadAdmin } from "@/lib/admin-auth";
import { notifyRole, notifyUsers } from "@/lib/app-notifications";
import { prisma } from "@/lib/prisma";

const ALLOWED_TARGETS = ["STUDENT", "SUB_ADMIN", "ADMIN", "SUPER_ADMIN", "ALL_ADMINS"] as const;

export async function POST(request: NextRequest) {
  const admin = await requireHeadAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const targetRole = typeof body.target === "string" ? body.target : "";
  const userId = typeof body.userId === "string" && body.userId ? body.userId : null;

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
  }
  if (subject.length > 120) return NextResponse.json({ error: "Subject is too long." }, { status: 400 });
  if (message.length > 4000) return NextResponse.json({ error: "Message is too long." }, { status: 400 });

  let created = 0;
  let emailed = 0;

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, email: true, name: true } });
    if (!user) return NextResponse.json({ error: "Recipient not found." }, { status: 400 });
    const outcome = await notifyUsers(
      [{ userId: user.id, role: user.role, email: user.email, name: user.name }],
      { subject, body: message, kind: "MESSAGE" }
    );
    created = outcome.created;
    emailed = outcome.emailed;
  } else {
    if (!ALLOWED_TARGETS.includes(targetRole as (typeof ALLOWED_TARGETS)[number])) {
      return NextResponse.json({ error: "Select a valid recipient group." }, { status: 400 });
    }
    const outcome = await notifyRole(targetRole, { subject, body: message, kind: "MESSAGE" });
    created = outcome.created;
    emailed = outcome.emailed;
  }

  await prisma.adminActivityLog.create({
    data: {
      userId: admin.userId,
      action: "message_sent",
      targetType: "system",
      details: JSON.stringify({ subject, recipients: userId ? "single" : targetRole, deliveredTo: created }),
    },
  });

  return NextResponse.json({ ok: true, created, emailed });
}