import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentToProfileInput } from "@/lib/student-mapper";
import { OnboardingClient } from "./onboarding-client";

export const metadata = {
  title: "Sign Up - Aclipse Hub",
};

// Public sign-up page: visitors create an account and complete the student
// information form in one flow. Signed-in users land here only when their
// profile is still incomplete.
export default async function OnboardingPage() {
  const session = await auth();

  if (session?.user?.id) {
    // Admins never fill the student form — send them to their dashboard
    const role = session.user.role;
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      redirect("/admin/dashboard");
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    });

    if (student?.profileCompleted) {
      redirect("/dashboard");
    }

    return (
      <OnboardingClient
        initialData={student ? studentToProfileInput(student) : null}
        isAuthenticated={true}
        accountName={session.user.name ?? ""}
        accountEmail={session.user.email ?? ""}
        accountImage={session.user.image ?? ""}
      />
    );
  }

  return (
    <OnboardingClient
      initialData={null}
      isAuthenticated={false}
      accountName=""
      accountEmail=""
      accountImage=""
    />
  );
}
