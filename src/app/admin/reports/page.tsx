"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";

interface Report {
  generatedAt: string;
  totals: { students: number; subAdmins: number; activeSubAdmins: number; questions: number };
  questionsByStatus: Record<string, number>;
  perSubAdmin: {
    userId: string;
    name: string;
    email: string;
    status: "ACTIVE" | "SUSPENDED";
    total: number;
    draft: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    published: number;
    other: number;
    approvalRate: number | null;
    lastLoginAt: string | null;
  }[];
  perSubject: { subjectId: string; subjectName: string; total: number; published: number }[];
  recentSubmissions: { id: string; text: string; subjectName: string; authorName: string | null; createdAt: string }[];
}

export default function AdminReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setReport(data.report);
    } catch {
      setError("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!report) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">{error ?? "No report."}</div>;
  }

  const statusOrder = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "PUBLISHED"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm mt-1">
          Platform overview — students, Sub-Admins and question pipeline health. Generated{" "}
          {new Date(report.generatedAt).toLocaleString()}.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Students", value: report.totals.students },
          { label: "Sub-Admins (Active)", value: `${report.totals.activeSubAdmins}/${report.totals.subAdmins}` },
          { label: "Questions", value: report.totals.questions },
          { label: "Approved", value: report.questionsByStatus.APPROVED ?? 0 },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-sm text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Question Pipeline</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statusOrder.map((s) => (
            <div key={s} className="rounded-lg bg-gray-50 p-3">
              <p className="text-lg font-semibold text-gray-900">{report.questionsByStatus[s] ?? 0}</p>
              <p className="text-xs text-gray-500">{s.replace("_", " ")}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <h2 className="text-lg font-semibold text-gray-900 px-6 pt-6 mb-3">Sub-Admin Output</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                <th className="px-5 py-3 font-medium">Sub-Admin</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Draft</th>
                <th className="px-5 py-3 font-medium">Pending</th>
                <th className="px-5 py-3 font-medium">Approved</th>
                <th className="px-5 py-3 font-medium">Rejected</th>
                <th className="px-5 py-3 font-medium">Published</th>
                <th className="px-5 py-3 font-medium">Approval Rate</th>
              </tr>
            </thead>
            <tbody>
              {report.perSubAdmin.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-gray-500">No Sub-Admins yet.</td>
                </tr>
              ) : (
                report.perSubAdmin.map((s) => (
                  <tr key={s.userId} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">{s.total}</td>
                    <td className="px-5 py-4">{s.draft}</td>
                    <td className="px-5 py-4">{s.pendingReview}</td>
                    <td className="px-5 py-4">{s.approved}</td>
                    <td className="px-5 py-4">{s.rejected}</td>
                    <td className="px-5 py-4">{s.published}</td>
                    <td className="px-5 py-4">{s.approvalRate === null ? "—" : `${s.approvalRate}%`}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Questions by Subject</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {report.perSubject.map((s) => (
            <div key={s.subjectId} className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-800">{s.subjectName}</p>
              <p className="text-xs text-gray-500">{s.total} total · {s.published} published</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recently Submitted</h2>
        {report.recentSubmissions.length === 0 ? (
          <p className="text-sm text-gray-500">No pending submissions.</p>
        ) : (
          <div className="space-y-2">
            {report.recentSubmissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-sm text-gray-800 truncate">{s.text}</p>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">{s.subjectName} · {s.authorName ?? "Unknown"}</p>
                  <p className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}