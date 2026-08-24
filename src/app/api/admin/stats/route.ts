import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [totalStudents, junior, senior, jambite, science, humanities, commercial, completedProfiles, activeStudents, recentlyRegistered] =
    await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { schoolLevel: "JUNIOR_SECONDARY" } }),
      prisma.student.count({ where: { schoolLevel: "SENIOR_SECONDARY" } }),
      prisma.student.count({ where: { classLevel: "JAMBITE" } }),
      prisma.student.count({ where: { department: "SCIENCE" } }),
      prisma.student.count({ where: { department: "HUMANITIES" } }),
      prisma.student.count({ where: { department: "COMMERCIAL" } }),
      prisma.student.count({ where: { profileCompleted: true } }),
      prisma.student.count({ where: { accountStatus: "ACTIVE" } }),
      prisma.student.findMany({
        orderBy: { enrolledAt: "desc" },
        take: 5,
        include: {
          user: { select: { name: true, email: true, image: true } },
        },
      }),
    ]);

  return NextResponse.json({
    totalStudents,
    juniorStudents: junior,
    seniorStudents: senior,
    jambiteStudents: jambite,
    scienceStudents: science,
    humanitiesStudents: humanities,
    commercialStudents: commercial,
    completedProfiles,
    incompleteProfiles: totalStudents - completedProfiles,
    activeStudents,
    inactiveStudents: totalStudents - activeStudents,
    recentRegistrations: recentlyRegistered.map((s) => ({
      id: s.id,
      name: s.user.name ?? s.surname ?? s.user.email,
      email: s.user.email,
      image: s.user.image,
      classLevel: s.classLevel,
      enrolledAt: s.enrolledAt,
      profileCompleted: s.profileCompleted,
    })),
  });
}
