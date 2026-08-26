"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

interface QuestionData {
  id: string;
  text: string;
  subjectId: string;
  options: string[];
  correctAnswer: number;
  explanation: string | null;
  difficulty: string;
  questionType: string;
  marks: number;
  status: string;
}

interface Slot {
  slotNumber: number;
  question: QuestionData | null;
}

type FilterTab = "all" | "empty" | "draft" | "published";

const TOTAL_SLOTS = 50;

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-400";

function emptyQuestion(): QuestionData {
  return {
    id: "",
    text: "",
    subjectId: "",
    options: ["", ""],
    correctAnswer: 0,
    explanation: null,
    difficulty: "MEDIUM",
    questionType: "MCQ",
    marks: 1,
    status: "DRAFT",
  };
}

export default function PremiumAccessPage() {
  const { status: sessionStatus } = useSession();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterTab>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const [drafts, setDrafts] = useState<Record<number, QuestionData>>({});
  const [savingSlot, setSavingSlot] = useState<number | null>(null);
  const [deletingSlot, setDeletingSlot] = useState<number | null>(null);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") window.location.href = "/login";
  }, [sessionStatus]);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/premium-access");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setSlots(data.slots);
    } catch {
      setError("Failed to load premium access questions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") loadSlots();
  }, [sessionStatus, loadSlots]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  function slotStatus(slot: Slot): "Empty" | "Draft" | "Published" {
    if (!slot.question) return "Empty";
    if (slot.question.status === "PUBLISHED") return "Published";
    return "Draft";
  }

  function statusBadge(status: string) {
    if (status === "Published") return "bg-green-100 text-green-700";
    if (status === "Draft") return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-500";
  }

  const filteredSlots = slots.filter((s) => {
    const st = slotStatus(s);
    if (filter === "all") return true;
    if (filter === "empty") return st === "Empty";
    if (filter === "draft") return st === "Draft";
    if (filter === "published") return st === "Published";
    return true;
  });

  const questionCount = slots.filter((s) => s.question !== null).length;

  function getDraft(slot: Slot): QuestionData {
    if (drafts[slot.slotNumber]) return drafts[slot.slotNumber];
    return slot.question ?? emptyQuestion();
  }

  function updateDraft(slotNumber: number, patch: Partial<QuestionData>) {
    setDrafts((prev) => {
      const existing = prev[slotNumber] ?? emptyQuestion();
      return { ...prev, [slotNumber]: { ...existing, ...patch } };
    });
  }

  function toggleExpand(slotNumber: number) {
    setExpanded((prev) => (prev === slotNumber ? null : slotNumber));
  }

  async function handleSave(slot: Slot) {
    const q = getDraft(slot);
    if (!q.text.trim()) {
      setError("Question text is required.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!q.subjectId.trim()) {
      setError("Subject ID is required.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSavingSlot(slot.slotNumber);
    setError(null);

    try {
      const res = await fetch("/api/admin/premium-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotNumber: slot.slotNumber,
          text: q.text,
          subjectId: q.subjectId,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          questionType: q.questionType,
          marks: q.marks,
          status: q.status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Request failed");
      }
      await loadSlots();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[slot.slotNumber];
        return next;
      });
      flash(`Slot ${slot.slotNumber} saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSavingSlot(null);
    }
  }

  async function handleDelete(slotNumber: number) {
    setDeletingSlot(slotNumber);
    setError(null);

    try {
      const res = await fetch("/api/admin/premium-access", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotNumber }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadSlots();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[slotNumber];
        return next;
      });
      setExpanded(null);
      flash(`Slot ${slotNumber} cleared.`);
    } catch {
      setError("Failed to delete question.");
    } finally {
      setDeletingSlot(null);
    }
  }

  if (sessionStatus === "loading") {
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
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-6">
            {success}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Premium Access Exam</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create up to {TOTAL_SLOTS} questions for Premium Access students
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress
            </span>
            <span className="text-sm font-semibold text-primary">
              {questionCount}/{TOTAL_SLOTS} questions created
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-primary rounded-full h-3 transition-all duration-300"
              style={{ width: `${(questionCount / TOTAL_SLOTS) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(["all", "empty", "draft", "published"] as FilterTab[]).map((tab) => {
            const label = tab.charAt(0).toUpperCase() + tab.slice(1);
            const count =
              tab === "all"
                ? slots.length
                : slots.filter((s) => {
                    const st = slotStatus(s);
                    if (tab === "empty") return st === "Empty";
                    if (tab === "draft") return st === "Draft";
                    if (tab === "published") return st === "Published";
                    return true;
                  }).length;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === tab
                    ? "bg-primary text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSlots.map((slot) => {
              const st = slotStatus(slot);
              const isOpen = expanded === slot.slotNumber;
              const draft = isOpen ? getDraft(slot) : null;
              const preview = slot.question
                ? slot.question.text.slice(0, 60) + (slot.question.text.length > 60 ? "..." : "")
                : "No question";

              return (
                <div
                  key={slot.slotNumber}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(slot.slotNumber)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center">
                        {slot.slotNumber}
                      </span>
                      <span className="text-sm text-gray-700 truncate">{preview}</span>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(st)}`}
                      >
                        {st}
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isOpen && draft && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Question Text *</label>
                        <textarea
                          value={draft.text}
                          onChange={(e) => updateDraft(slot.slotNumber, { text: e.target.value })}
                          className={inputCls}
                          rows={3}
                          placeholder="Enter question text..."
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={draft.questionType}
                            onChange={(e) => updateDraft(slot.slotNumber, { questionType: e.target.value })}
                            className={inputCls}
                          >
                            <option value="MCQ">MCQ</option>
                            <option value="TRUE_FALSE">True / False</option>
                            <option value="OBJECTIVE">Objective</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subject ID *</label>
                          <input
                            type="text"
                            value={draft.subjectId}
                            onChange={(e) => updateDraft(slot.slotNumber, { subjectId: e.target.value })}
                            className={inputCls}
                            placeholder="Enter subject ID..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                          <input
                            type="number"
                            min={1}
                            value={draft.marks}
                            onChange={(e) =>
                              updateDraft(slot.slotNumber, { marks: Number(e.target.value) || 1 })
                            }
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                          <select
                            value={draft.difficulty}
                            onChange={(e) => updateDraft(slot.slotNumber, { difficulty: e.target.value })}
                            className={inputCls}
                          >
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                        <div className="space-y-2">
                          {draft.options.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-4 text-center">{idx + 1}.</span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...draft.options];
                                  newOpts[idx] = e.target.value;
                                  updateDraft(slot.slotNumber, { options: newOpts });
                                }}
                                className={inputCls}
                                placeholder={`Option ${idx + 1}`}
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(slot.slotNumber, { options: [...draft.options, ""] })
                            }
                            className="text-xs text-primary hover:text-blue-700 font-medium"
                          >
                            + Add option
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                          <select
                            value={draft.correctAnswer}
                            onChange={(e) =>
                              updateDraft(slot.slotNumber, { correctAnswer: Number(e.target.value) })
                            }
                            className={inputCls}
                          >
                            {draft.options.map((_, idx) => (
                              <option key={idx} value={idx}>
                                Option {idx + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={draft.status}
                            onChange={(e) => updateDraft(slot.slotNumber, { status: e.target.value })}
                            className={inputCls}
                          >
                            <option value="DRAFT">Draft</option>
                            <option value="PUBLISHED">Published</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
                        <textarea
                          value={draft.explanation ?? ""}
                          onChange={(e) =>
                            updateDraft(slot.slotNumber, { explanation: e.target.value || null })
                          }
                          className={inputCls}
                          rows={2}
                          placeholder="Optional explanation..."
                        />
                      </div>

                      <div className="flex justify-between pt-2">
                        <button
                          onClick={() => handleDelete(slot.slotNumber)}
                          disabled={deletingSlot === slot.slotNumber || st === "Empty"}
                          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingSlot === slot.slotNumber ? "Deleting..." : "Delete"}
                        </button>
                        <button
                          onClick={() => handleSave(slot)}
                          disabled={savingSlot === slot.slotNumber}
                          className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {savingSlot === slot.slotNumber ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {!loading && filteredSlots.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">
                No slots match the current filter.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
