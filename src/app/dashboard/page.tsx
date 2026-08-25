import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./dashboard-client";

export const metadata = {
  title: "Dashboard - Aclipse Hub",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const userId = session.user.id;
  const userRole = session.user.role;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const student = await prisma.student.findUnique({
    where: { userId },
  });

  if (!isAdmin && !student?.profileCompleted) {
    redirect("/onboarding");
  }

  if (student && student.accountStatus === "DEACTIVATED") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Account Deactivated</h1>
          <p className="text-gray-600 mb-6">
            Your account has been deactivated. Please contact your administrator for assistance.
          </p>
        </div>
      </div>
    );
  }

  await prisma.user
    .update({ where: { id: userId }, data: { lastActiveAt: new Date() } })
    .catch(() => undefined);

  return (
    <DashboardClient
      userName={session.user.name ?? "Student"}
      userEmail={session.user.email ?? ""}
    />
  );
}
