"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ACADEMIC_SESSIONS,
  CLASSES_BY_LEVEL,
  DEPARTMENTS,
  SCHOOL_LEVELS,
} from "@/lib/student-form";
import { NIGERIAN_STATES } from "@/lib/nigeria";

interface StudentRow {
  id: string;
  name: string;
  email: string;
  image: string | null;
  phone: string | null;
  schoolName: string | null;
  schoolLevel: string | null;
  classLevel: string | null;
  department: string | null;
  stateOfOrigin: string | null;
  academicSession: string | null;
  registeredAt: string;
  profileCompleted: boolean;
  profileCompletion: number;
  accountStatus: string;
}

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 max-w-full";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [schoolLevel, setSchoolLevel] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [department, setDepartment] = useState("");
  const [stateOfOrigin, setStateOfOrigin] = useState("");
  const [academicSession, setAcademicSession] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [completion, setCompletion] = useState("");

  const classOptions =
    schoolLevel === "JUNIOR_SECONDARY"
      ? CLASSES_BY_LEVEL.JUNIOR_SECONDARY
      : schoolLevel === "SENIOR_SECONDARY"
      ? CLASSES_BY_LEVEL.SENIOR_SECONDARY
      : [...CLASSES_BY_LEVEL.JUNIOR_SECONDARY, ...CLASSES_BY_LEVEL.SENIOR_SECONDARY];

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (schoolLevel) params.set("schoolLevel", schoolLevel);
    if (classLevel) params.set("class", classLevel);
    if (department && schoolLevel !== "JUNIOR_SECONDARY") params.set("department", department);
    if (stateOfOrigin) params.set("state", stateOfOrigin);
    if (academicSession) params.set("session", academicSession);
    if (accountStatus) params.set("accountStatus", accountStatus);
    if (completion) params.set("completion", completion);
    try {
      const res = await fetch(`/api/admin/students?${params.toString()}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setStudents(json.students);
      setTotal(json.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, schoolLevel, classLevel, department, stateOfOrigin, academicSession, accountStatus, completion]);

  useEffect(() => {
    const t = setTimeout(loadStudents, 300);
    return () => clearTimeout(t);
  }, [loadStudents]);

  async function toggleAccountStatus(student: StudentRow) {
    const next = student.accountStatus === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, accountStatus: next } : s))
    );
    const res = await fetch(`/api/admin/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountStatus: next }),
    });
    if (!res.ok) loadStudents();
  }

  function exportCsv() {
    const params = new URLSearchParams({ format: "csv" });
    if (search) params.set("search", search);
    if (schoolLevel) params.set("schoolLevel", schoolLevel);
    if (classLevel) params.set("class", classLevel);
    if (department && schoolLevel !== "JUNIOR_SECONDARY") params.set("department", department);
    if (stateOfOrigin) params.set("state", stateOfOrigin);
    if (academicSession) params.set("session", academicSession);
    if (accountStatus) params.set("accountStatus", accountStatus);
    if (completion) params.set("completion", completion);
    window.location.href = `/api/admin/students?${params.toString()}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Student Management</h1>
          <Link href="/admin/dashboard" className="text-sm text-gray-600 hover:text-primary transition-colors">
            ← Admin Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, email or school..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-400"
              />
            </div>
            <button
              onClick={exportCsv}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium shrink-0"
            >
              Export CSV
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <select value={schoolLevel} onChange={(e) => { setSchoolLevel(e.target.value); setClassLevel(""); }} className={selectCls}>
              <option value="">All Levels</option>
              {SCHOOL_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>

            <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className={selectCls} disabled={!classOptions.length}>
              <option value="">All Classes</option>
              {classOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className={selectCls}
              disabled={schoolLevel === "JUNIOR_SECONDARY"}
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>

            <select value={stateOfOrigin} onChange={(e) => setStateOfOrigin(e.target.value)} className={selectCls}>
              <option value="">All States</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select value={academicSession} onChange={(e) => setAcademicSession(e.target.value)} className={selectCls}>
              <option value="">All Sessions</option>
              {ACADEMIC_SESSIONS.slice().reverse().map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)} className={selectCls}>
              <option value="">Any Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>

            <select value={completion} onChange={(e) => setCompletion(e.target.value)} className={selectCls}>
              <option value="">Any Completion</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Incomplete</option>
            </select>

            {(search || schoolLevel || classLevel || department || stateOfOrigin || academicSession || accountStatus || completion) && (
              <button
                onClick={() => {
                  setSearch("");
                  setSchoolLevel("");
                  setClassLevel("");
                  setDepartment("");
                  setStateOfOrigin("");
                  setAcademicSession("");
                  setAccountStatus("");
                  setCompletion("");
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
          <table className="w-full min-w-[960px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Student", "Email", "School", "Level", "Class", "Department", "State", "Registered", "Profile", "Status", "Actions"].map(
                  (th) => (
                    <th key={th} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {th}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-red-600">
                    Failed to load students.
                  </td>
                </tr>
              )}
              {!loading && !error && students.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                    No students found matching your filters.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/admin/students/${student.id}`} className="flex items-center group">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white font-medium text-sm">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-900 group-hover:text-primary truncate max-w-[160px]">
                          {student.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 max-w-[180px] truncate">{student.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 max-w-[140px] truncate">{student.schoolName || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{levelLabel(student.schoolLevel)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{student.classLevel || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{deptLabel(student.department)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{student.stateOfOrigin || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(student.registeredAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          student.profileCompleted
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {student.profileCompleted ? `${student.profileCompletion}%` : `${student.profileCompletion}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          student.accountStatus === "ACTIVE"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {student.accountStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/admin/students/${student.id}`} className="text-primary hover:text-blue-700 mr-3">
                        View
                      </Link>
                      <button
                        onClick={() => toggleAccountStatus(student)}
                        className={student.accountStatus === "ACTIVE" ? "text-red-600 hover:text-red-800" : "text-green-600 hover:text-green-800"}
                      >
                        {student.accountStatus === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && !error && (
            <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              Showing {students.length} of {total} student{total === 1 ? "" : "s"}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function levelLabel(value: string | null): string {
  if (!value) return "—";
  return SCHOOL_LEVELS.find((l) => l.value === value)?.label ?? value;
}

function deptLabel(value: string | null): string {
  if (!value) return "—";
  return DEPARTMENTS.find((d) => d.value === value)?.label ?? value;
}
