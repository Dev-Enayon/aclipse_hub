"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface CbtItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  schoolTier: string | null;
  examType: string;
  reviewFeedback: string | null;
  subject: { name: string } | null;
  _count: { questions: number; attempts: number };
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-700",
  PENDING_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  PUBLISHED: "bg-teal-100 text-teal-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function SubAdminCbtsPage() {
  const [cbts, setCbts] = useState<CbtItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sub-admin/cbts");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setCbts(data.cbts ?? []);
    } catch {
      setError("Failed to load CBTs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitForReview(id: string, title: string) {
    if (!window.confirm(`Submit "${title}" for Head Admin review?`)) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/sub-admin/cbts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING_REVIEW" }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Failed");
      await load();
      flash(`"${title}" submitted for review.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(c: CbtItem) {
    if (!window.confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
    setBusyId(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/sub-admin/cbts/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed");
      }
      await load();
      flash("CBT deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My CBTs</h1>
          <p className="text-gray-500 text-sm mt-1">
            Compose CBTs from your approved questions, then submit them for Head Admin approval.
          </p>
        </div>
        <Link
          href="/sub-admin/cbts/create"
          className="mt-3 sm:mt-0 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors"
        >
          + New CBT
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-6">{success}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : !cbts || cbts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            You have not created any CBTs yet.
            <div className="mt-3">
              <Link href="/sub-admin/cbts/create" className="text-primary font-medium hover:underline">
                Create your first CBT
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                  <th className="px-5 py-3 font-medium">CBT</th>
                  <th className="px-5 py-3 font-medium">Tier / Type</th>
                  <th className="px-5 py-3 font-medium">Questions</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Attempts</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cbts.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 align-top">
                    <td className="px-5 py-4">
                      <Link href={`/sub-admin/cbts/${c.id}`} className="font-medium text-primary hover:underline">
                        {c.title}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">{c.subject?.name ?? "No subject"}</p>
                      {c.reviewFeedback && c.status === "REJECTED" && (
                        <p className="text-xs text-red-600 mt-1 max-w-md">Feedback: {c.reviewFeedback}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {c.schoolTier ?? "Any"} · {c.examType}
                    </td>
                    <td className="px-5 py-4 text-gray-700">{c._count.questions}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{c._count.attempts}</td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      {(c.status === "DRAFT" || c.status === "REJECTED") && (
                        <button
                          onClick={() => submitForReview(c.id, c.title)}
                          disabled={busyId === c.id}
                          className="text-xs font-medium text-green-600 hover:underline disabled:opacity-50 mr-3"
                        >
                          Submit
                        </button>
                      )}
                      <Link
                        href={`/sub-admin/cbts/${c.id}`}
                        className="text-xs font-medium text-primary hover:underline mr-3"
                      >
                        {c.status === "DRAFT" || c.status === "REJECTED" ? "Edit" : "View"}
                      </Link>
                      {(c.status === "DRAFT" || c.status === "REJECTED") && (
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={busyId === c.id}
                          className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}