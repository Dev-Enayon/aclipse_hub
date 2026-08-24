import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";

const VALID_STATUS = ["PENDING", "APPROVED", "SUSPENDED"];
const VALID_ACCOUNT_STATUS = ["ACTIVE", "DEACTIVATED"];
const VALID_LEVELS = ["JUNIOR_SECONDARY", "SENIOR_SECONDARY"];
const VALID_CLASSES = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "JAMBITE"];
const VALID_DEPARTMENTS = ["SCIENCE", "HUMANITIES", "COMMERCIAL"];

function cleanStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          provider: true,
          createdAt: true,
          lastLoginAt: true,
          lastActiveAt: true,
        },
      },
      attempts: {
        select: { id: true, score: true, completedAt: true, startedAt: true },
        orderBy: { startedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const parseArr = (v: string): string[] => {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  };

  return NextResponse.json({
    student: {
      ...student,
      difficultSubjects: parseArr(student.difficultSubjects),
      utmeSubjects: parseArr(student.utmeSubjects),
      hobbies: parseArr(student.hobbies),
      interests: parseArr(student.interests),
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  const strFields = [
    "surname",
    "otherNames",
    "preferredName",
    "gender",
    "phone",
    "stateOfOrigin",
    "lga",
    "homeAddress",
    "schoolLevel",
    "classLevel",
    "schoolName",
    "schoolType",
    "academicSession",
    "previousClass",
    "academicPerformance",
    "favouriteSubject",
    "guardianName",
    "guardianRelationship",
    "guardianPhone",
    "guardianEmail",
    "emergencyContactName",
    "emergencyContactPhone",
    "aboutMe",
    "careerAmbition",
    "dreamJob",
  ] as const;

  for (const field of strFields) {
    if (field in body) data[field] = cleanStr(body[field]) ?? null;
  }

  if ("status" in body) {
    if (!VALID_STATUS.includes(String(body.status))) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }

  if ("accountStatus" in body) {
    if (!VALID_ACCOUNT_STATUS.includes(String(body.accountStatus))) {
      return NextResponse.json({ error: "Invalid account status" }, { status: 400 });
    }
    data.accountStatus = body.accountStatus;
  }

  for (const level of ["schoolLevel", "classLevel"] as const) {
    if (level in data && data[level] !== null) {
      const valid = level === "schoolLevel" ? VALID_LEVELS : VALID_CLASSES;
      if (!valid.includes(String(data[level]))) {
        return NextResponse.json({ error: `Invalid ${level}` }, { status: 400 });
      }
    }
  }

  if ("department" in data && data.department !== null) {
    if (!VALID_DEPARTMENTS.includes(String(data.department))) {
      return NextResponse.json({ error: "Invalid department" }, { status: 400 });
    }
  }

  if ("classLevel" in data || "department" in data || "schoolLevel" in data) {
    const classLevel =
      ("classLevel" in data ? (data.classLevel as string | null) : existing.classLevel) ?? "";
    const department =
      ("department" in data ? (data.department as string | null) : existing.department) ?? "";
    if (["JSS1", "JSS2", "JSS3"].includes(classLevel) && department) {
      data.department = null;
    }
  }

  const student = await prisma.student.update({
    where: { id },
    data,
  });

  return NextResponse.json({ student });
}
