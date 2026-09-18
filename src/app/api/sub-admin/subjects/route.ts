import { NextResponse } from "next/server";
import { requireSubAdmin } from "@/lib/admin-auth";
import { listSubjects } from "@/lib/subjects";

/** GET: list subjects for the Sub-Admin question form (active Sub-Admins only). */
export async function GET() {
  if (!(await requireSubAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const subjects = await listSubjects();
  return NextResponse.json({ subjects });
}