import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";

const VALID_LEVELS = ["JUNIOR_SECONDARY", "SENIOR_SECONDARY"];
const VALID_CLASSES = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "JAMBITE"];
const VALID_DEPARTMENTS = ["SCIENCE", "HUMANITIES", "COMMERCIAL"];
const VALID_ACCOUNT_STATUS = ["ACTIVE", "DEACTIVATED"];

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
  const schoolLevel = searchParams.get("schoolLevel") ?? "";
  const classLevel = searchParams.get("class") ?? "";
  const department = searchParams.get("department") ?? "";
  const stateOfOrigin = searchParams.get("state") ?? "";
  const academicSession = searchParams.get("session") ?? "";
  const accountStatus = searchParams.get("accountStatus") ?? "";
  const completion = searchParams.get("completion") ?? "";
  const format = searchParams.get("format") ?? "";

  if (
    (schoolLevel && !VALID_LEVELS.includes(schoolLevel)) ||
    (classLevel && !VALID_CLASSES.includes(classLevel)) ||
    (department && !VALID_DEPARTMENTS.includes(department)) ||
    (accountStatus && !VALID_ACCOUNT_STATUS.includes(accountStatus))
  ) {
    return NextResponse.json({ error: "Invalid filter value" }, { status: 400 });
  }

  const where: Record<string, unknown> = {};
  if (schoolLevel) where.schoolLevel = schoolLevel;
  if (classLevel) where.classLevel = classLevel;
  if (department) where.department = department;
  if (stateOfOrigin) where.stateOfOrigin = stateOfOrigin;
  if (academicSession) where.academicSession = academicSession;
  if (accountStatus) where.accountStatus = accountStatus;
  if (completion === "completed") where.profileCompleted = true;
  if (completion === "incomplete") where.profileCompleted = false;

  const students = await prisma.student.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, image: true, createdAt: true, lastLoginAt: true, lastActiveAt: true } },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const filtered = search
    ? students.filter((s) => {
        const name = (s.user.name ?? "") + " " + (s.surname ?? "") + " " + (s.otherNames ?? "");
        const email = s.user.email ?? "";
        const school = s.schoolName ?? "";
        return (
          name.toLowerCase().includes(search) ||
          email.toLowerCase().includes(search) ||
          school.toLowerCase().includes(search)
        );
      })
    : students;

  if (format === "csv") {
    return new NextResponse(buildCsv(filtered), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="students-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    total: filtered.length,
    students: filtered.map((s) => ({
      id: s.id,
      name:
        [s.surname, s.otherNames].filter(Boolean).join(" ") ||
        s.user.name ||
        s.user.email,
      googleName: s.user.name,
      email: s.user.email,
      image: s.user.image,
      phone: s.phone,
      schoolName: s.schoolName,
      schoolLevel: s.schoolLevel,
      classLevel: s.classLevel,
      department: s.department,
      stateOfOrigin: s.stateOfOrigin,
      academicSession: s.academicSession,
      registeredAt: s.enrolledAt,
      profileCompleted: s.profileCompleted,
      profileCompletion: s.profileCompletion,
      accountStatus: s.accountStatus,
    })),
  });
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

type StudentWithUser = Prisma.StudentGetPayload<{
  include: { user: { select: { id: true; name: true; email: true; image: true; createdAt: true; lastLoginAt: true; lastActiveAt: true } } };
}>;

function buildCsv(students: StudentWithUser[]): string {
  const header = [
    "Name",
    "Email",
    "Phone",
    "School",
    "School Level",
    "Class",
    "Department",
    "State of Origin",
    "LGA",
    "Academic Session",
    "Gender",
    "Date of Birth",
    "Guardian Name",
    "Guardian Phone",
    "Registered At",
    "Profile Completion %",
    "Profile Completed",
    "Account Status",
  ];
  const rows = students.map((s) =>
    [
      [s.surname, s.otherNames].filter(Boolean).join(" ") || s.user.name || s.user.email,
      s.user.email,
      s.phone,
      s.schoolName,
      s.schoolLevel,
      s.classLevel,
      s.department,
      s.stateOfOrigin,
      s.lga,
      s.academicSession,
      s.gender,
      s.dateOfBirth ? s.dateOfBirth.toISOString().slice(0, 10) : "",
      s.guardianName,
      s.guardianPhone,
      s.enrolledAt.toISOString(),
      s.profileCompletion,
      s.profileCompleted ? "Yes" : "No",
      s.accountStatus,
    ]
      .map(csvEscape)
      .join(",")
  );
  return header.join(",") + "\n" + rows.join("\n");
}
