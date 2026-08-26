import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";

const SUPER_ADMIN_LINKS = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Sub-Admins", href: "/admin/sub-admins" },
  { label: "All Students", href: "/admin/students" },
  { label: "Student Assignments", href: "/admin/assignments" },
  { label: "Questions", href: "/admin/questions" },
  { label: "Exams", href: "/admin/exams" },
  { label: "Activity Log", href: "/admin/activity-log" },
  { label: "Audit Log", href: "/admin/audit-log" },
];

const ADMIN_LINKS = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "My Students", href: "/admin/students" },
  { label: "Questions", href: "/admin/questions" },
  { label: "Exams", href: "/admin/exams" },
  { label: "Activity Log", href: "/admin/activity-log" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const userName = session.user.name || "Admin";
  const userEmail = session.user.email || "";

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar
        userName={userName}
        userEmail={userEmail}
        role={role}
        superAdminLinks={SUPER_ADMIN_LINKS}
        adminLinks={ADMIN_LINKS}
      />

      {/* Main content — offset by sidebar width on desktop */}
      <main className="md:ml-64 min-h-screen">{children}</main>
    </div>
  );
}
