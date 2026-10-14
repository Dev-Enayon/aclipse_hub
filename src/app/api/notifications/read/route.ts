import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markNotificationsRead } from "@/lib/app-notifications";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let ids: string[] = [];
  try {
    const body = (await request.json()) as { ids?: unknown };
    if (Array.isArray(body?.ids)) ids = body.ids.filter((x): x is string => typeof x === "string");
  } catch {
    // mark all read when no body
  }

  const updated = await markNotificationsRead(session.user.id, ids);
  return NextResponse.json({ ok: true, updated });
}