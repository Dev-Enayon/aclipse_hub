import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listSubjects } from "@/lib/subjects";

/** GET: list subjects (ADMIN | SUPER_ADMIN) — used by admin-side question review / creation UIs. */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const subjects = await listSubjects();
  return NextResponse.json({ subjects });
}