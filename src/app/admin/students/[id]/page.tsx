import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/student-mapper";
import { AccountStatusActions } from "./account-actions";

export const metadata = {
  title: "Student Profile - Aclipse Hub Admin",
};

function label<T extends { value: string; label: string }>(options: readonly T[], value: string | null): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <dl className="px-6 py-2 divide-y divide-gray-50">
        {children}
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="text-sm text-gray-500 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900 font-medium text-right whitespace-pre-wrap">
        {value === undefined || value === null || String(value).trim() === "" ? "—" : value}
      </dd>
    </div>
  );
}

const LEVELS = [
  { value: "JUNIOR_SECONDARY", label: "Junior Secondary School" },
  { value: "SENIOR_SECONDARY", label: "Senior Secondary School / JAMBites" },
];
const DEPARTMENTS = [
  { value: "SCIENCE", label: "Science" },
  { value: "HUMANITIES", label: "Humanities (Art)" },
  { value: "COMMERCIAL", label: "Commercial" },
];
const SCHOOL_TYPES = [
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Private" },
  { value: "OTHER", label: "Other" },
];
const PERFORMANCE = [
  { value: "EXCELLENT", label: "Excellent" },
  { value: "VERY_GOOD", label: "Very Good" },
  { value: "GOOD", label: "Good" },
  { value: "AVERAGE", label: "Average" },
  { value: "NEEDS_IMPROVEMENT", label: "Needs Improvement" },
];
const RELATIONSHIPS = [
  { value: "FATHER", label: "Father" },
  { value: "MOTHER", label: "Mother" },
  { value: "GUARDIAN", label: "Guardian" },
  { value: "OTHER", label: "Other" },
];

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AdminStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
          provider: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
          lastActiveAt: true,
        },
      },
      attempts: {
        select: { id: true, score: true, totalQuestions: true, completedAt: true, startedAt: true },
        orderBy: { startedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!student) notFound();

  const displayName =
    [student.surname, student.otherNames].filter(Boolean).join(" ") ||
    student.user.name ||
    student.user.email;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 bg-primary rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-bold">{displayName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">{displayName}</h1>
              <p className="text-sm text-gray-500 truncate">{student.user.email}</p>
            </div>
          </div>
          <AccountStatusActions
            studentId={student.id}
            accountStatus={student.accountStatus}
            status={student.status}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Status overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="text-xs text-gray-500 mb-1">Profile Completion</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${student.profileCompletion}%` }}></div>
              </div>
              <span className="text-lg font-bold text-primary">{student.profileCompletion}%</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="text-xs text-gray-500 mb-1">Enrollment Status</div>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              student.status === "APPROVED"
                ? "bg-green-100 text-green-700"
                : student.status === "SUSPENDED"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}>
              {student.status}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="text-xs text-gray-500 mb-1">Class / Department</div>
            <div className="font-semibold text-gray-900">
              {[student.classLevel, student.department && DEPARTMENTS.find((d) => d.value === student.department)?.label]
                .filter(Boolean)
                .join(" — ") || "—"}
            </div>
          </div>
        </div>

        <InfoSection title="Personal Information">
          <Row label="Surname" value={student.surname} />
          <Row label="Other Names" value={student.otherNames} />
          <Row label="Preferred Name" value={student.preferredName} />
          <Row label="Gender" value={label([
            { value: "MALE", label: "Male" },
            { value: "FEMALE", label: "Female" },
            { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
          ], student.gender)} />
          <Row label="Date of Birth" value={student.dateOfBirth ? student.dateOfBirth.toISOString().slice(0, 10) : ""} />
          <Row label="Phone" value={student.phone} />
          <Row label="State of Origin" value={student.stateOfOrigin} />
          <Row label="LGA" value={student.lga} />
          <Row label="Home Address" value={student.homeAddress} />
        </InfoSection>

        <InfoSection title="Academic Information">
          <Row label="School Name" value={student.schoolName} />
          <Row label="School Type" value={label(SCHOOL_TYPES, student.schoolType)} />
          <Row label="School Level" value={label(LEVELS, student.schoolLevel)} />
          <Row label="Class" value={student.classLevel} />
          <Row label="Department" value={label(DEPARTMENTS, student.department)} />
          <Row label="Academic Session" value={student.academicSession} />
          <Row label="Previous Class/Grade" value={student.previousClass} />
          <Row label="Academic Performance" value={label(PERFORMANCE, student.academicPerformance)} />
          <Row label="Favourite Subject" value={student.favouriteSubject} />
          <Row label="Difficult Subjects" value={parseJsonArray(student.difficultSubjects).join(", ")} />
        </InfoSection>

        {student.classLevel === "JAMBITE" && (
          <InfoSection title="JAMB Information">
            <Row label="JAMB Registration Number" value={student.jambRegNumber} />
            <Row label="JAMB Target Score" value={student.jambTargetScore} />
            <Row label="Intended Course of Study" value={student.intendedCourseOfStudy} />
            <Row label="First Choice University" value={student.firstChoiceUniversity} />
            <Row label="Second Choice University" value={student.secondChoiceUniversity} />
            <Row label="UTME Subjects" value={parseJsonArray(student.utmeSubjects).join(", ")} />
            <Row label="Current Mock/Test Score" value={student.mockScore} />
          </InfoSection>
        )}

        <InfoSection title="Parent / Guardian Information">
          <Row label="Guardian Full Name" value={student.guardianName} />
          <Row label="Relationship to Student" value={label(RELATIONSHIPS, student.guardianRelationship)} />
          <Row label="Guardian Phone" value={student.guardianPhone} />
          <Row label="Guardian Email" value={student.guardianEmail} />
          <Row label="Emergency Contact Name" value={student.emergencyContactName} />
          <Row label="Emergency Contact Phone" value={student.emergencyContactPhone} />
        </InfoSection>

        <InfoSection title="Student Profile">
          <Row label="About Me" value={student.aboutMe} />
          <Row label="Hobbies" value={parseJsonArray(student.hobbies).join(", ")} />
          <Row label="Interests" value={parseJsonArray(student.interests).join(", ")} />
          <Row label="Career Ambition" value={student.careerAmbition} />
          <Row label="Dream Job" value={student.dreamJob} />
        </InfoSection>

        <InfoSection title="Account Information">
          <Row label="Account Email" value={student.user.email} />
          <Row label="Authentication Provider" value={student.user.provider} />
          <Row label="Registration Date" value={fmtDate(student.enrolledAt)} />
          <Row label="Last Login" value={fmtDate(student.user.lastLoginAt)} />
          <Row label="Last Active" value={fmtDate(student.user.lastActiveAt)} />
          <Row label="Role" value={student.user.role} />
        </InfoSection>

        <InfoSection title="Recent Exam Attempts">
          {student.attempts.length === 0 ? (
            <Row label="" value={<span className="text-gray-400">No exam attempts yet.</span>} />
          ) : (
            student.attempts.map((attempt) => (
              <Row
                key={attempt.id}
                label={
                  attempt.completedAt
                    ? fmtDate(attempt.startedAt)
                    : `${fmtDate(attempt.startedAt)} (in progress)`
                }
                value={
                  attempt.score !== null && attempt.totalQuestions
                    ? `${attempt.score}/${attempt.totalQuestions}`
                    : "—"
                }
              />
            ))
          )}
        </InfoSection>

        <div className="pb-8">
          <Link href="/admin/students" className="text-sm text-primary hover:text-blue-700 font-medium">
            ← Back to Student Management
          </Link>
        </div>
      </main>
    </div>
  );
}
