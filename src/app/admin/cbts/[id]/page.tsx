"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Attempt {
  id: string;
  studentName: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  user: { email: string | null; name: string | null } | null;
  entryCode: { code: string } | null;
  results: { correctAnswers: number; totalQuestions: number; percentage: number; releasedAt: string | null }[];
}

interface CbtMeta {
  id: string;
  title: string;
  status: string;
  schoolTier: string | null;
  examType: string;
  author: { name: string | null; email: string } | null;
  subject: { name: string } | null;
  reviewFeedback: string | null;
}

export default function AdminCbtDetailPage() {
  const params = useParams<{ id: string }>();
  const [meta, setMeta] = useState<CbtMeta | null>(null);
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 5000);
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const [a, m] = await Promise.all([
        fetch(`/api/admin/cbts/${params.id}/attempts`),
        fetch("/api/admin/cbts"),
      ]);
      if (!a.ok) throw new Error(String(a.status));
      const aData = await a.json();
      setAttempts(aData.attempts ?? []);
      if (m.ok) {
        const mData = await m.json();
        setMeta(mData.cbts?.find((c: { id: string }) => c.id === params.id) ?? null);
      }
    } catch {
      setError("Failed to load CBT data.");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function release() {
    if (!window.confirm("Release results to all candidates who completed this CBT?")) return;
    setReleasing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/cbts/${params.id}/release`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Release failed");
      await load();
      flash(`Released ${body.released ?? 0} result(s). Candidates can open their result page via the notification link.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Release failed.");
    } finally {
      setReleasing(false);
    }
  }

  const completed = attempts?.filter((x) => x.results?.some((r) => r.releasedAt)).length ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-6">{success}</div>}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link href="/admin/cbts" className="text-xs text-gray-500 hover:text-primary">
            ← All CBTs
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{meta?.title ?? "CBT"}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {meta?.subject?.name ?? "No subject"} · {meta?.schoolTier ?? "All tiers"} · {meta?.examType} · by {meta?.author?.email ?? "unknown"}
          </p>
          {meta?.reviewFeedback && (
            <p className="text-sm text-red-600 mt-1">Rejection feedback: {meta.reviewFeedback}</p>
          )}
        </div>
        {meta?.status === "PUBLISHED" && (
          <button
            onClick={release}
            disabled={releasing}
            className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {releasing ? "Releasing..." : "Release all results"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500 mb-1">Total attempts</p>
          <p className="text-2xl font-bold text-gray-900">{attempts?.length ?? "—"}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-gray-900">{attempts?.filter((x) => x.status === "COMPLETED").length ?? "—"}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500 mb-1">Results released</p>
          <p className="text-2xl font-bold text-green-600">{completed}</p>
        </div>
      </div>

      <Link
        href="/admin/entry-codes"
        className="inline-block text-sm font-medium text-primary hover:underline mb-6"
      >
        Issue entry codes for this CBT →
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Candidates</h2>
        </div>
        {!attempts ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : attempts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No students have taken this CBT yet. They need an entry code to start.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Entry code</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((x) => {
                  const result = x.results?.[0];
                  return (
                    <tr key={x.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{x.studentName ?? x.user?.name ?? "—"}</p>
                        <p className="text-xs text-gray-500">{x.user?.email ?? "entry code only"}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-600">{x.entryCode?.code ?? "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${x.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {x.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {result ? (
                          <span className={result.releasedAt ? "font-semibold text-gray-900" : "text-gray-400"}>
                            {result.releasedAt ? `${result.correctAnswers}/${result.totalQuestions} (${result.percentage}%)` : "Not released"}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">{new Date(x.startedAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}