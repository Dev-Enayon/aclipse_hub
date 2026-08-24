import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeProfileCompletion, validateFullSubmission } from "@/lib/student-form";
import { sanitizeProfileInput, stringifyJsonArray, toDateOrNull } from "@/lib/student-mapper";

async function requireUserId() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user.id || null;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const student = await prisma.student.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!student) {
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({
    profile: sanitizeProfileInput(student as unknown as Record<string, unknown>),
    profileCompleted: student.profileCompleted,
    profileCompletion: student.profileCompletion,
    accountStatus: student.accountStatus,
    user: {
      name: student.user.name,
      email: student.user.email,
      image: student.user.image,
      role: student.user.role,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const submit = body.submit === true;
  const input = sanitizeProfileInput(body);

  if (submit) {
    const errors = validateFullSubmission(input);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", errors },
        { status: 422 }
      );
    }
  }

  const data = {
    phone: input.phone,
    surname: input.surname,
    otherNames: input.otherNames,
    preferredName: input.preferredName,
    gender: input.gender,
    dateOfBirth: toDateOrNull(input.dateOfBirth),
    stateOfOrigin: input.stateOfOrigin,
    lga: input.lga,
    homeAddress: input.homeAddress,
    schoolLevel: input.schoolLevel,
    classLevel: input.classLevel,
    department: departmentValueFor(input),
    schoolName: input.schoolName,
    schoolType: input.schoolType,
    academicSession: input.academicSession,
    previousClass: input.previousClass,
    academicPerformance: input.academicPerformance,
    favouriteSubject: input.favouriteSubject,
    difficultSubjects: stringifyJsonArray(input.difficultSubjects),
    jambRegNumber: input.jambRegNumber,
    jambTargetScore: input.jambTargetScore ?? null,
    intendedCourseOfStudy: input.intendedCourseOfStudy,
    firstChoiceUniversity: input.firstChoiceUniversity,
    secondChoiceUniversity: input.secondChoiceUniversity,
    utmeSubjects: stringifyJsonArray(input.utmeSubjects),
    mockScore: input.mockScore ?? null,
    guardianName: input.guardianName,
    guardianRelationship: input.guardianRelationship,
    guardianPhone: input.guardianPhone,
    guardianEmail: input.guardianEmail,
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone,
    aboutMe: input.aboutMe,
    hobbies: stringifyJsonArray(input.hobbies),
    interests: stringifyJsonArray(input.interests),
    careerAmbition: input.careerAmbition,
    dreamJob: input.dreamJob,
    profileCompleted: submit ? true : undefined,
    profileCompletion: computeProfileCompletion(input),
  };

  const existing = await prisma.student.findUnique({ where: { userId } });
  const studentData = {
    ...data,
    ...(existing
      ? {}
      : { status: "PENDING" }),
  };

  const student = await prisma.student.upsert({
    where: { userId },
    create: { userId, ...studentData },
    update: studentData,
  });

  await prisma.user.updateMany({
    where: { id: userId, role: "VISITOR" },
    data: { role: "STUDENT" },
  });

  if (!submit && !student.profileCompleted) {
    return NextResponse.json({
      saved: true,
      submitted: false,
      profileCompletion: student.profileCompletion,
    });
  }

  return NextResponse.json({
    saved: true,
    submitted: submit ? true : student.profileCompleted,
    profileCompleted: student.profileCompleted,
    profileCompletion: student.profileCompletion,
  });
}

function departmentValueFor(input: ReturnType<typeof sanitizeProfileInput>): string | undefined {
  if (input.classLevel === "JSS1" || input.classLevel === "JSS2" || input.classLevel === "JSS3") {
    return undefined;
  }
  return input.department;
}
