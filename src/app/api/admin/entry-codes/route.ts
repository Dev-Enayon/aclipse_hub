import { NextRequest, NextResponse } from "next/server";
import { requireHeadAdmin } from "@/lib/admin-auth";
import { createEntryCodes, listEntryCodes } from "@/lib/entry-codes";

export async function GET(request: NextRequest) {
  const admin = await requireHeadAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cbtId = request.nextUrl.searchParams.get("cbtId") ?? undefined;
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const codes = await listEntryCodes({ cbtId, status });

  return NextResponse.json({ codes });
}

export async function POST(request: NextRequest) {
  const admin = await requireHeadAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await createEntryCodes(admin.userId, {
    count: typeof body.count === "number" ? body.count : typeof body.count === "string" ? Number(body.count) : NaN,
    cbtId: typeof body.cbtId === "string" && body.cbtId ? body.cbtId : null,
    studentName: typeof body.studentName === "string" ? body.studentName : null,
    prefix: typeof body.prefix === "string" ? body.prefix : null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, codes: result.codes }, { status: 201 });
}