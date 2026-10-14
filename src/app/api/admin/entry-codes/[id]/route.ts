import { NextRequest, NextResponse } from "next/server";
import { requireHeadAdmin } from "@/lib/admin-auth";
import { revokeEntryCode } from "@/lib/entry-codes";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireHeadAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const revoked = await revokeEntryCode(id);
  if (!revoked) {
    return NextResponse.json(
      { error: "Only unused codes can be revoked." },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}