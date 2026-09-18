import { NextResponse } from "next/server";
import { requireHeadAdmin } from "@/lib/admin-auth";
import { getHeadAdminReport, withSubAdminStatusBreakdown } from "@/lib/reports";

/** GET /api/admin/reports — Head Admin dashboard report (students + Sub-Admins + questions). */
export async function GET() {
  if (!(await requireHeadAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const report = await withSubAdminStatusBreakdown(await getHeadAdminReport());
  return NextResponse.json({ report });
}