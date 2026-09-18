"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OwnQuestion {
  id: string;
  text: string;
  subjectName: string;
  subjectId: string;
  difficulty: string;
  status: string;
  reviewFeedback: string | null;
  createdAt: string;
}

const TABS = ["all", "DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "PUBLISHED"] as const;

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected (needs edit)",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-700",
  PENDING_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  PUBLISHED: "bg-teal-100 text-teal-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

export default function SubAdminQuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<OwnQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sub-admin/questions");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setQuestions(data.questions ?? []);
    } catch {
      setError("Failed to load your questions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this question? This cannot be undone.")) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/sub-admin/questions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Delete failed");
      }
      await load();
      flash("Question deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSubmit(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/sub-admin/questions/${id}/submit`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Submit failed");
      }
      await load();
      flash("Question submitted for review.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed.");
    } finally {
      setBusy(null);
    }
  }

  const filtered = tab === "all" ? questions : questions.filter((q) => q.status === tab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Questions</h1>
          <p className="text-gray-500 text-sm mt-1">
            DRAFT and REJECTED questions can be edited. Submit them for review when ready.
          </p>
        </div>
        <Link
          href="/sub-admin/questions/create"
          className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors"
        >
          + New Question
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-6">{success}</div>}

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => {
          const count = t === "all" ? questions.length : questions.filter((q) => q.status === t).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t === "all" ? "All" : STATUS_LABEL[t]} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm bg-white rounded-xl border border-gray-100">
          {tab === "all" ? "No questions yet." : "Nothing in this state."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const editable = q.status === "DRAFT" || q.status === "REJECTED";
            return (
              <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{q.text}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {q.subjectName} · {q.difficulty}
                      {q.reviewFeedback ? ` · Feedback: ${q.reviewFeedback}` : ""}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[q.status] ?? "bg-gray-100 text-gray-500"}`}
                  >
                    {STATUS_LABEL[q.status] ?? q.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-4 border-t border-gray-100 pt-4">
                  {editable ? (
                    <>
                      <button
                        onClick={() => router.push(`/sub-admin/questions/${q.id}/edit`)}
                        className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleSubmit(q.id)}
                        disabled={busy === q.id}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
                      >
                        {busy === q.id ? "Submitting..." : "Submit for Review"}
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        disabled={busy === q.id}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">
                      {q.status === "PENDING_REVIEW"
                        ? "Awaiting Head Admin review."
                        : "Locked — cannot be edited."}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}