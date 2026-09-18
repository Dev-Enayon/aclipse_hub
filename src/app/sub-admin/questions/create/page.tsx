"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Subject { id: string; name: string; }

const inputCls =
  "w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-400";
const selectCls = `${inputCls} max-w-full`;

export default function CreateQuestionPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [explanation, setExplanation] = useState("");
  const [year, setYear] = useState("");

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sub-admin/subjects");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setSubjects(data.subjects ?? []);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const errors: string[] = [];
  if (!text.trim()) errors.push("Question text is required.");
  if (!subjectId) errors.push("Please choose a subject.");
  options.forEach((opt, i) => {
    if (!opt.trim()) errors.push(`Option ${String.fromCharCode(65 + i)} is required.`);
  });
  if (correctAnswer < 0 || correctAnswer > 3) errors.push("Select one correct option (A–D).");

  async function doSubmit(goToSubmit: boolean) {
    setError(null);
    setSuccess(null);
    if (errors.length > 0) {
      setError(errors.join(" "));
      return;
    }
    setSubmitting(goToSubmit ? "submit" : "draft");
    try {
      const res = await fetch("/api/sub-admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          subjectId,
          options,
          correctAnswer,
          difficulty,
          explanation: explanation.trim() || undefined,
          year: year ? Number(year) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed");
      }
      const data = await res.json();
      if (goToSubmit && data.questionId) {
        await fetch(`/api/sub-admin/questions/${data.questionId}/submit`, { method: "POST" });
        setSuccess("Question created and submitted for review!");
      } else {
        setSuccess("Question saved as draft.");
      }
      setTimeout(() => router.push("/sub-admin/questions"), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(null);
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/sub-admin/questions" className="text-sm text-primary hover:underline mb-2 inline-block">
          ← Back to My Questions
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Question</h1>
        <p className="text-gray-500 text-sm mt-1">Write an objective MCQ question for Head Admin review.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-6">{success}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Question Text *</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputCls}
            rows={3}
            placeholder="Type the question here..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className={selectCls}
            >
              <option value="">Select a subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className={selectCls}
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year (optional)</label>
            <input
              type="number"
              min={1980}
              max={new Date().getFullYear()}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={inputCls}
              placeholder="e.g. 2024"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Options (A–D) *</label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={correctAnswer === idx}
                  onChange={() => setCorrectAnswer(idx)}
                  className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-xs font-semibold text-gray-500 w-5">{String.fromCharCode(65 + idx)}.</span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[idx] = e.target.value;
                    setOptions(next);
                  }}
                  className={inputCls}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Select the radio button next to the correct answer.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (optional)</label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className={inputCls}
            rows={2}
            placeholder="A brief explanation shown after the answer is revealed..."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => doSubmit(false)}
            disabled={submitting !== null}
            className="px-5 py-2.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting === "draft" ? "Saving..." : "Save as Draft"}
          </button>
          <button
            onClick={() => doSubmit(true)}
            disabled={submitting !== null}
            className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting === "submit" ? "Saving & Submitting..." : "Save & Submit for Review"}
          </button>
        </div>
      </div>
    </div>
  );
}