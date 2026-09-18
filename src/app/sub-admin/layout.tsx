import { redirect } from "next/navigation";
import { requireSubAdmin } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/sidebar";

const SUB_ADMIN_LINKS = [
  { label: "Dashboard", href: "/sub-admin/dashboard" },
  { label: "My Questions", href: "/sub-admin/questions" },
  { label: "Create Question", href: "/sub-admin/questions/create" },
];

export default async function SubAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const subAdmin = await requireSubAdmin();

  if (!subAdmin) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar
        userName={subAdmin.name ?? "Sub-Admin"}
        userEmail={subAdmin.email}
        role="SUB_ADMIN"
        superAdminLinks={[]}
        adminLinks={[]}
        subAdminLinks={SUB_ADMIN_LINKS}
      />

      {/* Main content — offset by sidebar width on desktop */}
      <main className="md:ml-64 min-h-screen">{children}</main>
    </div>
  );
}