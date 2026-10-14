import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listNotificationsForUser, unreadNotificationCount } from "@/lib/app-notifications";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const take = Number(new URL(request.url).searchParams.get("take") || "20");
  const [items, unread] = await Promise.all([
    listNotificationsForUser(session.user.id, Math.min(Math.max(take, 1), 100)),
    unreadNotificationCount(session.user.id),
  ]);

  return NextResponse.json({ notifications: items, unread });
}