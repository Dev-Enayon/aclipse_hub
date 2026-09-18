import { NextRequest, NextResponse } from "next/server";
import { requireHeadAdmin } from "@/lib/admin-auth";
import { createSubAdmin, listSubAdmins, countActiveSubAdmins, ACTIVE_SUB_ADMIN_LIMIT } from "@/lib/sub-admins";
import { logAdminActivity } from "@/lib/activity-logger";

/** GET: list Sub-Admins (Head Admin only) */
export async function GET() {
  const admin = await requireHeadAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [subAdmins, activeCount] = await Promise.all([listSubAdmins(), countActiveSubAdmins()]);

  return NextResponse.json({
    subAdmins,
    activeCount,
    limit: ACTIVE_SUB_ADMIN_LIMIT,
    slotsLeft: Math.max(0, ACTIVE_SUB_ADMIN_LIMIT - activeCount),
  });
}

/** POST: create a Sub-Admin (Head Admin only, global max 6 active enforced in a transaction) */
export async function POST(request: NextRequest) {
  const admin = await requireHeadAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : "";
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const department = typeof body.department === "string" ? body.department : undefined;

  const result = await createSubAdmin({ name, email, password, department });
  if (!result.ok) {
    const isLimitError = result.error.includes("Only") && result.error.includes("active Sub-Admins");
    return NextResponse.json({ error: result.error }, { status: isLimitError ? 409 : 400 });
  }

  await logAdminActivity(admin.userId, "sub_admin_created", {
    targetType: "sub_admin",
    targetId: result.user.id,
    details: { email: result.user.email, name: result.user.name },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true, user: result.user }, { status: 201 });
}