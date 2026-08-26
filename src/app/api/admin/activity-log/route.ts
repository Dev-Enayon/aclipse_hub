import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

/** GET: admin activity logs — Head Admin sees all, Sub-Admin sees own */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");
  const targetType = searchParams.get("targetType");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const take = Math.min(Number(searchParams.get("take") ?? "100"), 500);

  const where: Record<string, unknown> = {};
  // Sub-Admin can only see their own logs
  if (admin.role !== "SUPER_ADMIN") {
    where.userId = admin.userId;
  } else if (userId) {
    where.userId = userId;
  }

  if (action) where.action = action;
  if (targetType) where.targetType = targetType;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
  }

  const logs = await prisma.adminActivityLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.user.name,
      userEmail: l.user.email,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      details: (() => { try { return JSON.parse(l.details); } catch { return l.details; } })(),
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    })),
  });
}
