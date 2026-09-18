import { NextRequest, NextResponse } from "next/server";
import { requireHeadAdmin } from "@/lib/admin-auth";
import { setSubAdminStatus, updateSubAdmin } from "@/lib/sub-admins";
import { prisma } from "@/lib/prisma";
import { logAdminActivity } from "@/lib/activity-logger";

/**
 * PATCH /api/admin/sub-admins/[userId]
 * Actions (Head Admin only):
 *  - { action: "suspend" | "reactivate" } — manage account state (never deletes data)
 *  - { name?, department?, password? } — update profile
 * Suspending frees a slot toward the global 6-active limit.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireHeadAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!target) return NextResponse.json({ error: "Sub-Admin not found" }, { status: 404 });

  let result: { ok: true } | { ok: false; error: string };
  let actionLog: string;

  if (body.action === "suspend" || body.action === "reactivate") {
    result = await setSubAdminStatus(userId, body.action === "suspend" ? "SUSPENDED" : "ACTIVE");
    actionLog = body.action === "suspend" ? "sub_admin_suspended" : "sub_admin_reactivated";
  } else {
    result = await updateSubAdmin(userId, {
      name: typeof body.name === "string" ? body.name : undefined,
      department: typeof body.department === "string" ? body.department : undefined,
      password: typeof body.password === "string" && body.password ? body.password : undefined,
    });
    actionLog = "sub_admin_updated";
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminActivity(admin.userId, actionLog, {
    targetType: "sub_admin",
    targetId: userId,
    details: { email: target.email },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}