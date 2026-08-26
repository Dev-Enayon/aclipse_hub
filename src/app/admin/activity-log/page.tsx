"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: unknown;
  ipAddress: string;
  createdAt: string;
}

interface SubAdmin {
  id: string;
  name: string;
  email: string;
}

const ACTION_TYPES = [
  "login",
  "logout",
  "question_created",
  "question_edited",
  "question_deleted",
  "question_published",
  "exam_created",
  "exam_edited",
  "student_viewed",
  "student_assigned",
  "student_unassigned",
  "sub_admin_created",
  "sub_admin_edited",
  "sub_admin_deleted",
];

function formatAction(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatDetails(details: unknown): string {
  if (!details) return "—";
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      return Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
    } catch {
      return details;
    }
  }
  if (typeof details === "object") {
    return Object.entries(details as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return String(details);
}

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 max-w-full";

export default function ActivityLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterAdmin, setFilterAdmin] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/activity-log");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setLogs(data.logs);
    } catch {
      setError("Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubAdmins = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sub-admins");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setSubAdmins(data.admins);
    } catch {
      // silently fail - filter dropdown just won't populate
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      loadLogs();
      if (isSuperAdmin) loadSubAdmins();
    }
  }, [status, isSuperAdmin, loadLogs, loadSubAdmins]);

  const filtered = logs.filter((log) => {
    const matchAdmin = !filterAdmin || log.userId === filterAdmin;
    const matchAction = !filterAction || log.action === filterAction;
    return matchAdmin && matchAction;
  });

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            {isSuperAdmin && (
              <select
                value={filterAdmin}
                onChange={(e) => setFilterAdmin(e.target.value)}
                className={selectCls}
              >
                <option value="">All Admins</option>
                {subAdmins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className={selectCls}
            >
              <option value="">All Actions</option>
              {ACTION_TYPES.map((a) => (
                <option key={a} value={a}>
                  {formatAction(a)}
                </option>
              ))}
            </select>
            {(filterAdmin || filterAction) && (
              <button
                onClick={() => {
                  setFilterAdmin("");
                  setFilterAction("");
                }}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Admin Name", "Action", "Target Type", "Details", "Date/Time"].map((th) => (
                  <th
                    key={th}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No activity recorded yet
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-purple-700 font-medium text-sm">
                            {(log.userName ?? "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <span className="text-sm font-medium text-gray-900 block">
                            {log.userName ?? "Unknown"}
                          </span>
                          <span className="text-xs text-gray-500">{log.userEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {log.targetType || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                      {formatDetails(log.details)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <span>{formatRelativeTime(log.createdAt)}</span>
                        <span className="block text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              Showing {filtered.length} of {logs.length} log{logs.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
