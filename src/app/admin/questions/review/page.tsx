"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";

interface ReviewQuestion {
  id: string;
  text: string;
  subjectName: string;
  difficulty: string;
  year: number | null;
  options: string[];
  correctAnswer: number;
  explanation: string | null;
  author: { id: string; name: string; email: string } | null;
  createdAt: string;
}

interface ApprovedQuestion {
  id: string;
  text: string;
  subjectName: string;
  authorEmail?: string;
  status: string;
  createdAt: string;
}

export default function AdminReviewPage() {
  const [pending, setPending] = useState<ReviewQuestion[]>([]);
  const [approved, setApproved] = useState<ApprovedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        fetch("/api/admin/questions/review"),
        fetch("/api/admin/questions?status=APPROVED"),
      ]);
      if (!pendingRes.ok || !approvedRes.ok) throw new Error(String(pendingRes.status));
      const pendingData = await pendingRes.json();
      const approvedData = await approvedRes.json();
      setPending(pendingData.questions ?? []);
      setApproved(approvedData.questions ?? []);
    } catch {
      setError("Failed to load questions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: string, action: "approve" | "reject") {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/questions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reject" ? { action, feedback } : { action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed");
      }
      await load();
      setRejecting(null);
      setFeedback("");
      flash(action === "approve" ? "Question approved." : "Question returned to the Sub-Admin.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function publish(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/questions/${id}/publish`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed");
      }
      await load();
      flash("Question published for students.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Question Review</h1>
        <p className="text-gray-500 text-sm mt-1">
          Approve good questions, return others with feedback. Publishing is a separate step.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-6">{success}</div>}

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending Review ({pending.length})</h2>
      {pending.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-500 text-sm mb-8">
          Nothing pending — Sub-Admin submissions will appear here.
        </div>
      ) : (
        <div className="space-y-4 mb-10">
          {pending.map((q) => (
            <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-semibold text-gray-900">{q.text}</p>
                <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {q.subjectName} · {q.difficulty}
                </span>
              </div>
              <div className="space-y-1.5 mb-4">
                {q.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      idx === q.correctAnswer ? "bg-green-50 text-green-800 ring-1 ring-green-200" : "bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span className="font-semibold w-5">{String.fromCharCode(65 + idx)}.</span>
                    <span>{opt}</span>
                    {idx === q.correctAnswer && <span className="ml-auto text-xs font-medium text-green-600">Correct</span>}
                  </div>
                ))}
              </div>
              {q.explanation && <p className="text-xs text-gray-500 mb-3">Explanation: {q.explanation}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500">
                  By {q.author?.name ?? q.author?.email ?? "Unknown"} · {new Date(q.createdAt).toLocaleString()}
                  {q.year ? ` · ${q.year}` : ""}
                </p>
                <div className="flex items-center gap-2">
                  {rejecting === q.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Feedback for the Sub-Admin…"
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-64"
                      />
                      <button
                        onClick={() => review(q.id, "reject")}
                        disabled={busy === q.id || !feedback.trim()}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Confirm reject
                      </button>
                      <button onClick={() => setRejecting(null)} className="text-xs text-gray-500 hover:underline">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => review(q.id, "approve")}
                        disabled={busy === q.id}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-60"
                      >
                        {busy === q.id ? "Working..." : "Approve"}
                      </button>
                      <button
                        onClick={() => setRejecting(q.id)}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Approved — Ready to Publish ({approved.length})</h2>
      {approved.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-500 text-sm">
          No approved questions waiting to be published.
        </div>
      ) : (
        <div className="space-y-2">
          {approved.map((q) => (
            <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-gray-800 truncate">{q.text}</p>
                <p className="text-xs text-gray-500">{q.subjectName}</p>
              </div>
              <button
                onClick={() => publish(q.id)}
                disabled={busy === q.id}
                className="flex-shrink-0 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {busy === q.id ? "Publishing..." : "Publish"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}