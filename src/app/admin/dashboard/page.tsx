"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalStudents: number;
  juniorStudents: number;
  seniorStudents: number;
  jambiteStudents: number;
  scienceStudents: number;
  humanitiesStudents: number;
  commercialStudents: number;
  completedProfiles: number;
  incompleteProfiles: number;
  activeStudents: number;
  inactiveStudents: number;
  recentRegistrations: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    classLevel: string | null;
    enrolledAt: string;
    profileCompleted: boolean;
  }[];
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/admin/stats")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(setStats)
      .catch(() => setError(true));
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                <span className="text-white font-bold">A</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Manage Aclipse Hub</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-sm text-gray-500">{session?.user?.email}</span>
              <Link href="/" className="text-gray-600 hover:text-primary transition-colors">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            Failed to load statistics.
          </div>
        )}

        {!stats && !error && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        )}

        {stats && (
          <>
            {/* Student Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <StatCard label="Total Students" value={stats.totalStudents} color="text-primary" />
              <StatCard label="Junior Secondary" value={stats.juniorStudents} color="text-blue-600" />
              <StatCard label="Senior Secondary" value={stats.seniorStudents} color="text-purple-600" />
              <StatCard label="JAMBites" value={stats.jambiteStudents} color="text-accent" />
              <StatCard label="Science" value={stats.scienceStudents} color="text-green-600" />
              <StatCard label="Humanities (Art)" value={stats.humanitiesStudents} color="text-pink-600" />
              <StatCard label="Commercial" value={stats.commercialStudents} color="text-teal-600" />
              <StatCard label="Completed Profiles" value={stats.completedProfiles} color="text-green-700" />
              <StatCard label="Incomplete Profiles" value={stats.incompleteProfiles} color="text-orange-600" />
              <StatCard label="Active Students" value={stats.activeStudents} color="text-emerald-600" />
              <StatCard label="Inactive Students" value={stats.inactiveStudents} color="text-gray-500" />
              <StatCard
                label="Completion Rate"
                value={
                  stats.totalStudents === 0
                    ? "0%"
                    : Math.round((stats.completedProfiles / stats.totalStudents) * 100) + "%"
                }
                color="text-indigo-600"
              />
            </div>

            {/* Recent Registrations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Recently Registered Students</h2>
                <Link href="/admin/students" className="text-sm text-primary hover:text-blue-700 font-medium">
                  View all
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {stats.recentRegistrations.length === 0 && (
                  <p className="px-6 py-8 text-center text-gray-500 text-sm">No students registered yet.</p>
                )}
                {stats.recentRegistrations.map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/students/${s.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center shrink-0">
                        <span className="text-white font-medium text-sm">{s.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{s.name}</p>
                        <p className="text-xs text-gray-500 truncate">{s.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {s.classLevel && (
                        <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {s.classLevel}
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          s.profileCompleted ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {s.profileCompleted ? "Complete" : "Pending"}
                      </span>
                      <span className="hidden md:block text-xs text-gray-400">
                        {new Date(s.enrolledAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Admin Menu */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Manage Students",
              description: "View, filter, edit, and manage all registered students",
              href: "/admin/students",
              icon: "👥",
              color: "bg-blue-50",
            },
            {
              title: "Question Bank",
              description: "Create, edit, and manage questions",
              href: "/admin/questions",
              icon: "❓",
              color: "bg-green-50",
            },
            {
              title: "Create Exams",
              description: "Build and publish exam papers",
              href: "/admin/exams",
              icon: "📝",
              color: "bg-orange-50",
            },
            {
              title: "Weekly Quiz",
              description: "Schedule and manage weekly quizzes",
              href: "/admin/quizzes",
              icon: "📅",
              color: "bg-purple-50",
            },
            {
              title: "Analytics",
              description: "View platform statistics and reports",
              href: "/admin/analytics",
              icon: "📊",
              color: "bg-red-50",
            },
            {
              title: "Settings",
              description: "Configure platform settings",
              href: "/admin/settings",
              icon: "⚙️",
              color: "bg-gray-50",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center text-2xl mb-4`}>
                {item.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
      <div className="text-xs text-gray-500 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{label}</div>
      <div className={`text-2xl lg:text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
