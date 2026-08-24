import type { Student } from "@prisma/client";
import type { StudentProfileInput } from "./student-form";

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function stringifyJsonArray(value: unknown): string {
  if (!Array.isArray(value)) return "[]";
  return JSON.stringify(value.map(String));
}

export function toDateOrNull(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

function cleanStr(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function cleanInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && /^\d+$/.test(value.trim())) {
    return parseInt(value.trim(), 10);
  }
  return undefined;
}

export function sanitizeProfileInput(raw: Record<string, unknown>): StudentProfileInput {
  return {
    surname: cleanStr(raw.surname),
    otherNames: cleanStr(raw.otherNames),
    preferredName: cleanStr(raw.preferredName),
    gender: cleanStr(raw.gender),
    dateOfBirth: typeof raw.dateOfBirth === "string" ? raw.dateOfBirth : null,
    phone: cleanStr(raw.phone),
    stateOfOrigin: cleanStr(raw.stateOfOrigin),
    lga: cleanStr(raw.lga),
    homeAddress: cleanStr(raw.homeAddress),
    schoolLevel: cleanStr(raw.schoolLevel),
    classLevel: cleanStr(raw.classLevel),
    department: cleanStr(raw.department),
    schoolName: cleanStr(raw.schoolName),
    schoolType: cleanStr(raw.schoolType),
    academicSession: cleanStr(raw.academicSession),
    previousClass: cleanStr(raw.previousClass),
    academicPerformance: cleanStr(raw.academicPerformance),
    favouriteSubject: cleanStr(raw.favouriteSubject),
    difficultSubjects: Array.isArray(raw.difficultSubjects)
      ? raw.difficultSubjects.map((s) => String(s)).filter((s) => s.trim() !== "")
      : [],
    jambRegNumber: cleanStr(raw.jambRegNumber),
    jambTargetScore: cleanInt(raw.jambTargetScore) ?? null,
    intendedCourseOfStudy: cleanStr(raw.intendedCourseOfStudy),
    firstChoiceUniversity: cleanStr(raw.firstChoiceUniversity),
    secondChoiceUniversity: cleanStr(raw.secondChoiceUniversity),
    utmeSubjects: Array.isArray(raw.utmeSubjects)
      ? raw.utmeSubjects.map((s) => String(s)).filter((s) => s.trim() !== "")
      : [],
    mockScore: cleanInt(raw.mockScore) ?? null,
    guardianName: cleanStr(raw.guardianName),
    guardianRelationship: cleanStr(raw.guardianRelationship),
    guardianPhone: cleanStr(raw.guardianPhone),
    guardianEmail: cleanStr(raw.guardianEmail),
    emergencyContactName: cleanStr(raw.emergencyContactName),
    emergencyContactPhone: cleanStr(raw.emergencyContactPhone),
    aboutMe: cleanStr(raw.aboutMe),
    hobbies: Array.isArray(raw.hobbies)
      ? raw.hobbies.map((s) => String(s)).filter((s) => s.trim() !== "")
      : [],
    interests: Array.isArray(raw.interests)
      ? raw.interests.map((s) => String(s)).filter((s) => s.trim() !== "")
      : [],
    careerAmbition: cleanStr(raw.careerAmbition),
    dreamJob: cleanStr(raw.dreamJob),
  };
}

export function studentToProfileInput(student: Student): StudentProfileInput {
  return {
    surname: student.surname ?? "",
    otherNames: student.otherNames ?? "",
    preferredName: student.preferredName ?? "",
    gender: student.gender ?? "",
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().slice(0, 10) : "",
    phone: student.phone ?? "",
    stateOfOrigin: student.stateOfOrigin ?? "",
    lga: student.lga ?? "",
    homeAddress: student.homeAddress ?? "",
    schoolLevel: student.schoolLevel ?? "",
    classLevel: student.classLevel ?? "",
    department: student.department ?? "",
    schoolName: student.schoolName ?? "",
    schoolType: student.schoolType ?? "",
    academicSession: student.academicSession ?? "",
    previousClass: student.previousClass ?? "",
    academicPerformance: student.academicPerformance ?? "",
    favouriteSubject: student.favouriteSubject ?? "",
    difficultSubjects: parseJsonArray(student.difficultSubjects),
    jambRegNumber: student.jambRegNumber ?? "",
    jambTargetScore: student.jambTargetScore,
    intendedCourseOfStudy: student.intendedCourseOfStudy ?? "",
    firstChoiceUniversity: student.firstChoiceUniversity ?? "",
    secondChoiceUniversity: student.secondChoiceUniversity ?? "",
    utmeSubjects: parseJsonArray(student.utmeSubjects),
    mockScore: student.mockScore,
    guardianName: student.guardianName ?? "",
    guardianRelationship: student.guardianRelationship ?? "",
    guardianPhone: student.guardianPhone ?? "",
    guardianEmail: student.guardianEmail ?? "",
    emergencyContactName: student.emergencyContactName ?? "",
    emergencyContactPhone: student.emergencyContactPhone ?? "",
    aboutMe: student.aboutMe ?? "",
    hobbies: parseJsonArray(student.hobbies),
    interests: parseJsonArray(student.interests),
    careerAmbition: student.careerAmbition ?? "",
    dreamJob: student.dreamJob ?? "",
  };
}
