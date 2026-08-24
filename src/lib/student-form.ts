import { NIGERIAN_STATES } from "./nigeria";

export const SCHOOL_LEVELS = [
  { value: "JUNIOR_SECONDARY", label: "Junior Secondary School" },
  { value: "SENIOR_SECONDARY", label: "Senior Secondary School / JAMBites" },
] as const;

export const CLASSES_BY_LEVEL: Record<string, { value: string; label: string }[]> = {
  JUNIOR_SECONDARY: [
    { value: "JSS1", label: "JSS1" },
    { value: "JSS2", label: "JSS2" },
    { value: "JSS3", label: "JSS3" },
  ],
  SENIOR_SECONDARY: [
    { value: "SS1", label: "SS1" },
    { value: "SS2", label: "SS2" },
    { value: "SS3", label: "SS3" },
    { value: "JAMBITE", label: "JAMBite" },
  ],
};

export const DEPARTMENTS = [
  { value: "SCIENCE", label: "Science" },
  { value: "HUMANITIES", label: "Humanities (Art)" },
  { value: "COMMERCIAL", label: "Commercial" },
] as const;

export const GENDERS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
] as const;

export const SCHOOL_TYPES = [
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Private" },
  { value: "OTHER", label: "Other" },
] as const;

export const PERFORMANCE_LEVELS = [
  { value: "EXCELLENT", label: "Excellent" },
  { value: "VERY_GOOD", label: "Very Good" },
  { value: "GOOD", label: "Good" },
  { value: "AVERAGE", label: "Average" },
  { value: "NEEDS_IMPROVEMENT", label: "Needs Improvement" },
] as const;

export const SUBJECTS = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Government",
  "Literature",
  "Geography",
  "Computer Science",
  "Civic Education",
  "Agricultural Science",
  "Further Mathematics",
  "Other",
] as const;

export const SUBJECT_OPTIONS = SUBJECTS.map((s) => ({ value: s, label: s }));

export const GUARDIAN_RELATIONSHIPS = [
  { value: "FATHER", label: "Father" },
  { value: "MOTHER", label: "Mother" },
  { value: "GUARDIAN", label: "Guardian" },
  { value: "OTHER", label: "Other" },
] as const;

export const ACADEMIC_SESSIONS: string[] = (() => {
  const sessions: string[] = [];
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 6; year <= currentYear + 4; year++) {
    sessions.push(`${year}/${year + 1}`);
  }
  return sessions;
})();

export function classesForLevel(schoolLevel: string | undefined) {
  if (!schoolLevel) return [];
  return CLASSES_BY_LEVEL[schoolLevel] ?? [];
}

export function departmentRequired(classLevel: string | undefined) {
  return !!classLevel && classLevel !== "JSS1" && classLevel !== "JSS2" && classLevel !== "JSS3";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  const cleaned = value.replace(/[\s\-().]/g, "");
  return /^\+?\d{7,15}$/.test(cleaned);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  if (d.getUTCFullYear() < 1990 || d.getUTCFullYear() > new Date().getUTCFullYear()) return false;
  return true;
}

export interface StudentProfileInput {
  surname?: string;
  otherNames?: string;
  preferredName?: string;
  gender?: string;
  dateOfBirth?: string | null;
  phone?: string;
  stateOfOrigin?: string;
  lga?: string;
  homeAddress?: string;
  schoolLevel?: string;
  classLevel?: string;
  department?: string;
  schoolName?: string;
  schoolType?: string;
  academicSession?: string;
  previousClass?: string;
  academicPerformance?: string;
  favouriteSubject?: string;
  difficultSubjects?: string[];
  jambRegNumber?: string;
  jambTargetScore?: number | null;
  intendedCourseOfStudy?: string;
  firstChoiceUniversity?: string;
  secondChoiceUniversity?: string;
  utmeSubjects?: string[];
  mockScore?: number | null;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  aboutMe?: string;
  hobbies?: string[];
  interests?: string[];
  careerAmbition?: string;
  dreamJob?: string;
}

export const ONBOARDING_STEPS = [
  "Personal Information",
  "Academic Information",
  "Additional Details",
  "Parent / Guardian",
  "Student Profile",
  "Review & Submit",
] as const;

type Errors = Record<string, string>;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function validatePersonalInfo(d: StudentProfileInput): Errors {
  const errors: Errors = {};
  if (!str(d.surname)) errors.surname = "Surname is required";
  if (!str(d.otherNames)) errors.otherNames = "Other names are required";
  if (str(d.gender) && !GENDERS.some((g) => g.value === d.gender)) errors.gender = "Invalid gender";
  if (str(d.dateOfBirth ?? "") && !isValidDate(d.dateOfBirth as string)) errors.dateOfBirth = "Enter a valid date";
  if (str(d.phone) && !isValidPhone(d.phone as string)) errors.phone = "Enter a valid phone number";
  if (str(d.stateOfOrigin) && !NIGERIAN_STATES.includes(str(d.stateOfOrigin))) errors.stateOfOrigin = "Invalid state";
  return errors;
}

export function validateAcademicInfo(d: StudentProfileInput): Errors {
  const errors: Errors = {};
  if (!str(d.schoolLevel)) errors.schoolLevel = "School level is required";
  else if (!CLASSES_BY_LEVEL[str(d.schoolLevel)]) errors.schoolLevel = "Invalid school level";
  if (!str(d.classLevel)) errors.classLevel = "Class is required";
  else if (str(d.schoolLevel) && !classesForLevel(d.schoolLevel).some((c) => c.value === d.classLevel))
    errors.classLevel = "Class does not match selected school level";
  if (departmentRequired(d.classLevel)) {
    if (!str(d.department)) errors.department = "Department is required";
    else if (!DEPARTMENTS.some((x) => x.value === d.department)) errors.department = "Invalid department";
  }
  if (d.classLevel === "JAMBITE") {
    if (str(d.jambTargetScore ?? "")) {
      const score = Number(d.jambTargetScore);
      if (!Number.isInteger(score) || score < 0 || score > 400)
        errors.jambTargetScore = "Target score must be between 0 and 400";
    }
    if (str(d.mockScore ?? "")) {
      const score = Number(d.mockScore);
      if (!Number.isInteger(score) || score < 0 || score > 400)
        errors.mockScore = "Mock score must be between 0 and 400";
    }
  }
  return errors;
}

export function validateAdditionalDetails(d: StudentProfileInput): Errors {
  const errors: Errors = {};
  if (str(d.schoolType) && !SCHOOL_TYPES.some((t) => t.value === d.schoolType)) errors.schoolType = "Invalid school type";
  if (
    str(d.academicSession) &&
    !ACADEMIC_SESSIONS.includes(str(d.academicSession))
  )
    errors.academicSession = "Invalid academic session";
  if (
    str(d.academicPerformance) &&
    !PERFORMANCE_LEVELS.some((p) => p.value === d.academicPerformance)
  )
    errors.academicPerformance = "Invalid performance level";
  return errors;
}

export function validateGuardianInfo(d: StudentProfileInput): Errors {
  const errors: Errors = {};
  if (!str(d.guardianName)) errors.guardianName = "Parent/Guardian full name is required";
  if (!str(d.guardianRelationship)) errors.guardianRelationship = "Relationship is required";
  else if (!GUARDIAN_RELATIONSHIPS.some((r) => r.value === d.guardianRelationship))
    errors.guardianRelationship = "Invalid relationship";
  if (!str(d.guardianPhone)) errors.guardianPhone = "Guardian phone number is required";
  else if (!isValidPhone(d.guardianPhone as string)) errors.guardianPhone = "Enter a valid phone number";
  if (str(d.guardianEmail) && !isValidEmail(d.guardianEmail as string)) errors.guardianEmail = "Enter a valid email address";
  if (str(d.emergencyContactPhone) && !isValidPhone(d.emergencyContactPhone as string))
    errors.emergencyContactPhone = "Enter a valid phone number";
  return errors;
}

const STEP_VALIDATORS: ((d: StudentProfileInput) => Errors)[] = [
  validatePersonalInfo,
  validateAcademicInfo,
  validateAdditionalDetails,
  validateGuardianInfo,
];

export function validateStep(stepIndex: number, d: StudentProfileInput): Errors {
  if (stepIndex >= 0 && stepIndex < STEP_VALIDATORS.length) {
    return STEP_VALIDATORS[stepIndex](d);
  }
  return {};
}

export function validateFullSubmission(d: StudentProfileInput): Errors {
  let errors: Errors = {};
  for (const validator of STEP_VALIDATORS) {
    errors = { ...errors, ...validator(d) };
  }
  return errors;
}

const COMPLETION_GROUPS: (keyof StudentProfileInput)[][] = [
  ["surname", "otherNames"],
  ["gender", "dateOfBirth", "phone", "stateOfOrigin", "lga", "homeAddress"],
  ["schoolLevel", "classLevel", "department", "schoolName", "schoolType", "academicSession", "academicPerformance"],
  ["guardianName", "guardianRelationship", "guardianPhone", "guardianEmail"],
  ["aboutMe", "hobbies", "interests", "careerAmbition", "dreamJob", "favouriteSubject"],
];

export function computeProfileCompletion(d: StudentProfileInput): number {
  let total = 0;
  let filled = 0;
  for (const group of COMPLETION_GROUPS) {
    total += group.length;
    for (const field of group) {
      const value = d[field];
      if (Array.isArray(value) ? value.length > 0 : !!str(String(value ?? ""))) filled++;
    }
  }
  return Math.round((filled / total) * 100);
}
