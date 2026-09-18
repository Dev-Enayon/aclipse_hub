"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface SubjectPerformance {
  subject: string;
  attempts: number;
  averageScore: number;
}

interface RecentAttempt {
  id: string;
  type: string;
  subject: string;
  score: number;
  total: number;
  percentage: number;
  date: string;
}

interface StudentInfo {
  id: string;
  name: string | null;
  email: string;
}

interface Stats {
  totalAttempts: number;
  averageScore: number;
  subjectsAttempted: number;
}

interface PerformanceData {
  student: StudentInfo;
  stats: Stats;
  recentAttempts: RecentAttempt[];
  subjectPerformance: SubjectPerformance[];
}

function scoreColor(pct: number) {
  if (pct >= 70) return "text-green-600";
  if (pct >= 50) return "text-yellow-600";
  return "text-red-600";
}

function scoreBg(pct: number) {
  if (pct >= 70) return "bg-green-100 text-green-700";
  if (pct >= 50) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function StudentPerformancePage() {
  const params = useParams();
  const userId = params.id as string;
  const { data: session } = useSession();

  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !session) return;

    const controller = new AbortController();

    async function fetchPerformance() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/admin/students/${userId}/performance`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to load performance data");
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchPerformance();

    return () => controller.abort();
  }, [userId, session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading performance data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center max-w-md">
          <p className="text-red-600 font-medium mb-2">Error</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Link
            href="/admin/students"
            className="text-sm text-primary hover:text-blue-700 font-medium"
          >
            &larr; Back to Students
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const displayName = data.student.name || data.student.email;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 bg-primary rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-bold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {displayName}
              </h1>
              <p className="text-sm text-gray-500 truncate">
                {data.student.email}
              </p>
            </div>
          </div>
          <Link
            href="/admin/students"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 shrink-0"
          >
            <span>&larr;</span> Back
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="text-xs text-gray-500 mb-1">Total Attempts</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.stats.totalAttempts}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="text-xs text-gray-500 mb-1">Average Score</div>
            <div
              className={`text-2xl font-bold ${scoreColor(data.stats.averageScore)}`}
            >
              {data.stats.averageScore}%
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="text-xs text-gray-500 mb-1">
              Subjects Attempted
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {data.stats.subjectsAttempted}
            </div>
          </div>
        </div>

        {/* Subject Performance Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Subject Performance</h2>
          </div>
          {data.subjectPerformance.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              No subject data available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    <th className="px-6 py-3">Subject</th>
                    <th className="px-6 py-3">Attempts</th>
                    <th className="px-6 py-3">Average Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subjectPerformance.map((s) => (
                    <tr
                      key={s.subject}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {s.subject}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{s.attempts}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${scoreBg(s.averageScore)}`}
                        >
                          {s.averageScore}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          {data.recentAttempts.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              No activity yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Subject</th>
                    <th className="px-6 py-3">Score</th>
                    <th className="px-6 py-3">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentAttempts.map((a) => (
                    <tr
                      key={a.id}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        {fmtDate(a.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            a.type === "Quiz"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {a.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{a.subject}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {a.score}/{a.total}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${scoreBg(a.percentage)}`}
                        >
                          {a.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
