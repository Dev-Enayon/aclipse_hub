"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Subject { id: string; name: string; }

interface Question {
  id: string;
  text: string;
  subjectId: string;
  subjectName: string;
  options: string[];
  correctAnswer: number;
  explanation: string | null;
  difficulty: string;
  year: number | null;
  status: string;
  reviewFeedback: string | null;
}

const inputCls =
  "w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-400";
const selectCls = `${inputCls} max-w-full`;

export default function EditQuestionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"save" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [explanation, setExplanation] = useState("");
  const [year, setYear] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sub-admin/subjects");
        if (res.ok) setSubjects((await res.json()).subjects ?? []);
      } catch {
        // ignore
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sub-admin/questions/${id}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const q: Question = data.question;
      setQuestion(q);
      setText(q.text);
      setSubjectId(q.subjectId);
      setOptions(Array.isArray(q.options) ? q.options : ["", "", "", ""]);
      setCorrectAnswer(q.correctAnswer ?? 0);
      setDifficulty(q.difficulty ?? "MEDIUM");
      setExplanation(q.explanation ?? "");
      setYear(q.year ? String(q.year) : "");
    } catch {
      setError("Could not load this question.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const editable = question?.status === "DRAFT" || question?.status === "REJECTED";

  async function doSave(goToSubmit: boolean) {
    setError(null);
    setSuccess(null);
    if (!text.trim()) return setError("Question text is required.");
    if (!subjectId) return setError("Please choose a subject.");
    if (options.some((o) => !o.trim())) return setError("All four options (A–D) are required.");
    setSaving(goToSubmit ? "submit" : "save");
    try {
      const res = await fetch(`/api/sub-admin/questions/${id}`, {
        method: "PATCH",
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
        throw new Error(data?.error ?? "Save failed");
      }
      if (goToSubmit) {
        await fetch(`/api/sub-admin/questions/${id}/submit`, { method: "POST" });
        setSuccess("Question saved and submitted for review!");
      } else {
        setSuccess("Question saved.");
      }
      setTimeout(() => router.push("/sub-admin/questions"), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
        <p className="mb-4">{error ?? "Question not found."}</p>
        <Link href="/sub-admin/questions" className="text-primary font-medium hover:underline">
          Back to My Questions
        </Link>
      </div>
    );
  }

  if (!editable) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Question Locked</h1>
          <p className="text-gray-600 mb-6">
            This question is currently “{question.status}” and cannot be edited.{" "}
            {question.status === "REJECTED"
              ? "Rejected questions can always be edited."
              : "Only DRAFT or REJECTED questions can be edited."}
          </p>
          <Link href="/sub-admin/questions" className="text-primary font-medium hover:underline">
            Back to My Questions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/sub-admin/questions" className="text-sm text-primary hover:underline mb-2 inline-block">
          ← Back to My Questions
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Question</h1>
        <p className="text-gray-500 text-sm mt-1">Status: {question.status === "REJECTED" ? "Returned — please correct it below." : "Draft"}</p>
      </div>

      {question.reviewFeedback && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-6">
          <span className="font-semibold">Reviewer feedback: </span>
          {question.reviewFeedback}
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-6">{success}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Question Text *</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} className={inputCls} rows={3} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={selectCls}>
              <option value="">Select a subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={selectCls}>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year (optional)</label>
            <input type="number" min={1980} value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} />
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
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (optional)</label>
          <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} className={inputCls} rows={2} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => doSave(false)}
            disabled={saving !== null}
            className="px-5 py-2.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving === "save" ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={() => doSave(true)}
            disabled={saving !== null}
            className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving === "submit" ? "Saving & Submitting..." : "Save & Submit for Review"}
          </button>
        </div>
      </div>
    </div>
  );
}