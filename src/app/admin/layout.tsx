import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Server-side authorization for ALL /admin routes.
// Runs before any admin page renders, regardless of client-side behavior.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
