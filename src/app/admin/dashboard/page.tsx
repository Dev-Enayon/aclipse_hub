"use client";
/* eslint-disable react-hooks/set-state-in-effect */

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

interface ActivityLogEntry {
  id: string;
  userName: string;
  userEmail: string;
  action: string;
  targetType: string;
  details: unknown;
  createdAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    setLoadingStats(true);
    fetch("/api/admin/stats")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: Stats) => setStats(data))
      .catch(() => setError("Failed to load statistics."))
      .finally(() => setLoadingStats(false));

    setLoadingActivity(true);
    fetch("/api/admin/activity-log?take=10")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { logs: ActivityLogEntry[] }) => setActivityLogs(data.logs))
      .catch(() => {})
      .finally(() => setLoadingActivity(false));
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const role = session?.user?.role ?? "ADMIN";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const userName = session?.user?.name ?? "Admin";

  const superAdminActions = [
    { title: "Manage Students", description: "View, filter, and manage all students", href: "/admin/students", icon: "👥", bg: "bg-blue-50" },
    { title: "Manage Sub-Admins", description: "Add, edit, and manage sub-admin accounts", href: "/admin/sub-admins", icon: "🔑", bg: "bg-purple-50" },
    { title: "Question Bank", description: "Create, edit, and manage questions", href: "/admin/questions", icon: "❓", bg: "bg-green-50" },
    { title: "Exams", description: "Build and publish exam papers", href: "/admin/exams", icon: "📝", bg: "bg-orange-50" },
    { title: "Activity Log", description: "Review admin and system activity", href: "/admin/activity-log", icon: "📋", bg: "bg-gray-50" },
  ];

  const subAdminActions = [
    { title: "My Students", description: "View and manage your assigned students", href: "/admin/students", icon: "👥", bg: "bg-blue-50" },
    { title: "Question Bank", description: "Create, edit, and manage questions", href: "/admin/questions", icon: "❓", bg: "bg-green-50" },
    { title: "Exams", description: "Build and publish exam papers", href: "/admin/exams", icon: "📝", bg: "bg-orange-50" },
    { title: "Activity Log", description: "Review your activity history", href: "/admin/activity-log", icon: "📋", bg: "bg-gray-50" },
  ];

  const quickActions = isSuperAdmin ? superAdminActions : subAdminActions;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome + Role Badge */}
        <div className="mb-8 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName}</h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isSuperAdmin
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {isSuperAdmin ? "Head Admin" : "Sub-Admin"}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {/* Loading spinner */}
        {loadingStats && !stats && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        )}

        {stats && (
          <>
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
              <StatCard
                label="Total Students"
                value={stats.totalStudents}
                color="text-primary"
                icon="👥"
              />
              <StatCard
                label="Active Students"
                value={stats.activeStudents}
                color="text-emerald-600"
                icon="✅"
              />
              <StatCard
                label="Completed Profiles"
                value={stats.completedProfiles}
                color="text-green-700"
                icon="📋"
              />
              <StatCard
                label="Questions Created"
                value="—"
                color="text-orange-600"
                icon="❓"
              />
              <StatCard
                label="Exams Created"
                value="—"
                color="text-blue-600"
                icon="📝"
              />
              {isSuperAdmin && (
                <StatCard
                  label="Sub-Admins"
                  value="—"
                  color="text-purple-600"
                  icon="🔑"
                />
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-10">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <Link
                  href="/admin/activity-log"
                  className="text-sm text-primary hover:text-blue-700 font-medium"
                >
                  View all
                </Link>
              </div>
              {loadingActivity ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : activityLogs.length === 0 ? (
                <p className="px-6 py-10 text-center text-gray-500 text-sm">
                  No activity recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-gray-600 font-medium text-xs">
                            {(log.userName ?? "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            <span className="font-medium">{log.userName ?? "Unknown"}</span>
                            {" "}
                            <span className="text-gray-500">{log.action}</span>
                            {log.targetType && (
                              <span className="text-gray-500"> on {log.targetType}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-4">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quickActions.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className={`w-12 h-12 ${item.bg} rounded-lg flex items-center justify-center text-2xl mb-4`}>
                      {item.icon}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number | string;
  color: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-2xl lg:text-3xl font-bold ${color}`}>
        {value === null || value === undefined ? "—" : value}
      </div>
    </div>
  );
}
