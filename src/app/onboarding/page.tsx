import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentToProfileInput } from "@/lib/student-mapper";
import { OnboardingClient } from "./onboarding-client";

export const metadata = {
  title: "Complete Your Profile - Aclipse Hub",
};

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/onboarding");
  }

  const userId = session.user.id;
  if (!userId) {
    redirect("/login?callbackUrl=/onboarding");
  }

  const student = await prisma.student.findUnique({
    where: { userId },
  });

  if (student?.profileCompleted) {
    redirect("/dashboard");
  }

  return (
    <OnboardingClient
      initialData={student ? studentToProfileInput(student) : null}
      googleName={session.user.name ?? ""}
      googleEmail={session.user.email ?? ""}
      googleImage={session.user.image ?? ""}
    />
  );
}
