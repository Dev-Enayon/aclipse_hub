import { NextResponse } from "next/server";
import { requireHeadAdmin } from "@/lib/admin-auth";
import { attemptsForCbt } from "@/lib/cbt-results";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireHeadAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const attempts = await attemptsForCbt(id);
  return NextResponse.json({ attempts });
}