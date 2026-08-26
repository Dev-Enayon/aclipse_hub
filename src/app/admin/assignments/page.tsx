"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Student {
  id: string;
  userId: string;
  name: string;
  email: string;
  classLevel: string | null;
  schoolLevel: string | null;
  department: string | null;
  profileCompleted: boolean;
  accountStatus: string;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  assignedAdminEmail: string | null;
  enrolledAt: string;
}

interface Admin {
  id: string;
  name: string;
  email: string;
}

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 max-w-full";

const CLASSES = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "JAMBITE"];
const DEPARTMENTS = [
  { value: "SCIENCE", label: "Science" },
  { value: "HUMANITIES", label: "Humanities" },
  { value: "COMMERCIAL", label: "Commercial" },
];

export default function AssignmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterAdmin, setFilterAdmin] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterDept, setFilterDept] = useState("");

  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/assignments");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setStudents(data.students);
      setAdmins(data.admins);
    } catch {
      setError("Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) loadData();
  }, [isSuperAdmin, loadData]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function assignStudent(studentUserId: string, adminId: string) {
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUserId, adminId }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadData();
      flash("Student assigned successfully.");
    } catch {
      setError("Failed to assign student.");
    }
  }

  async function unassignStudent(studentUserId: string) {
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUserId, adminId: null }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadData();
      flash("Student unassigned.");
    } catch {
      setError("Failed to unassign student.");
    }
  }

  const filtered = students.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchAdmin = !filterAdmin || s.assignedAdminId === filterAdmin;
    const matchClass = !filterClass || s.classLevel === filterClass;
    const matchDept = !filterDept || s.department === filterDept;
    return matchSearch && matchAdmin && matchClass && matchDept;
  });

  const assignedCount = students.filter((s) => s.assignedAdminId).length;
  const unassignedCount = students.length - assignedCount;

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500">You do not have permission to view this page.</p>
        </div>
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
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-6">
            {success}
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Student Assignments</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Students</p>
            <p className="text-2xl font-bold text-gray-900">{students.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Assigned</p>
            <p className="text-2xl font-bold text-green-600">{assignedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Unassigned</p>
            <p className="text-2xl font-bold text-orange-600">{unassignedCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-400"
              />
            </div>
            <select value={filterAdmin} onChange={(e) => setFilterAdmin(e.target.value)} className={selectCls}>
              <option value="">All Admins</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className={selectCls}>
              <option value="">All Classes</option>
              {CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className={selectCls}>
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            {(search || filterAdmin || filterClass || filterDept) && (
              <button
                onClick={() => { setSearch(""); setFilterAdmin(""); setFilterClass(""); setFilterDept(""); }}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Name", "Email", "Class", "Department", "Assigned To", "Status", "Actions"].map((th) => (
                  <th key={th} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-red-600">
                    Failed to load assignments.
                  </td>
                </tr>
              )}
              {!loading && !error && students.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No students registered yet.
                  </td>
                </tr>
              )}
              {!loading && !error && students.length > 0 && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No students match your filters.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white font-medium text-sm">
                            {s.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-900 truncate max-w-[160px]">
                          {s.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 max-w-[180px] truncate">
                      {s.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {s.classLevel || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {s.department || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {s.assignedAdminName ? (
                        <span className="text-green-700 font-medium">{s.assignedAdminName}</span>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          s.assignedAdminId
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {s.assignedAdminId ? "Assigned" : "Unassigned"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <select
                          value={s.assignedAdminId ?? ""}
                          onChange={(e) => {
                            if (e.target.value) assignStudent(s.userId, e.target.value);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-700"
                        >
                          <option value="">Assign...</option>
                          {admins.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                        {s.assignedAdminId && (
                          <button
                            onClick={() => unassignStudent(s.userId)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Unassign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && !error && (
            <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              Showing {filtered.length} of {students.length} student{students.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
