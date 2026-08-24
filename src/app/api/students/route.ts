import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

function isAdmin(session: Session | null): boolean {
  const role = session?.user?.role;
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET() {
  try {
    const session = await auth();

    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const students = await prisma.student.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        attempts: {
          select: {
            id: true,
            score: true,
            completedAt: true,
          },
          where: { completedAt: { not: null } },
          orderBy: { completedAt: "desc" },
          take: 5,
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return NextResponse.json(students);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, phone, institution } = body;

    const student = await prisma.student.create({
      data: {
        userId,
        phone,
        institution,
        status: "PENDING",
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (
      typeof id !== "string" ||
      !["PENDING", "APPROVED", "SUSPENDED"].includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid id or status" },
        { status: 400 }
      );
    }

    const student = await prisma.student.update({
      where: { id },
      data: { status },
      include: { user: true },
    });

    return NextResponse.json(student);
  } catch {
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 }
    );
  }
}
