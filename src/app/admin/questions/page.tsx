"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

interface Subject {
  id: string;
  name: string;
}

interface Question {
  id: string;
  text: string;
  subjectId: string;
  subject: Subject | null;
  options: string[];
  correctAnswer: number;
  explanation: string | null;
  difficulty: string;
  questionType: string;
  marks: number;
  year: number | null;
  status: string;
  createdBy: string;
  author: { id: string; name: string; email: string } | null;
  createdAt: string;
}

interface QuestionForm {
  text: string;
  subjectId: string;
  questionType: string;
  options: string[];
  correctAnswer: number;
  marks: number;
  difficulty: string;
  explanation: string;
  year: string;
  status: string;
}

const emptyForm: QuestionForm = {
  text: "",
  subjectId: "",
  questionType: "MCQ",
  options: ["", "", "", ""],
  correctAnswer: 0,
  marks: 1,
  difficulty: "MEDIUM",
  explanation: "",
  year: "",
  status: "DRAFT",
};

const selectCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 max-w-full";

const inputCls =
  "w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-400";

export default function QuestionsPage() {
  const { data: session, status } = useSession();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") window.location.href = "/login";
  }, [status]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/questions");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setQuestions(data.questions);
    } catch {
      setError("Failed to load questions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") loadQuestions();
  }, [status, loadQuestions]);

  const subjects: Subject[] = (() => {
    const map = new Map<string, Subject>();
    for (const q of questions) {
      if (q.subject && !map.has(q.subject.id)) map.set(q.subject.id, q.subject);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(q: Question) {
    setEditingId(q.id);
    setForm({
      text: q.text,
      subjectId: q.subjectId,
      questionType: q.questionType,
      options: Array.isArray(q.options) ? [...q.options] : [],
      correctAnswer: q.correctAnswer,
      marks: q.marks,
      difficulty: q.difficulty,
      explanation: q.explanation ?? "",
      year: q.year ? String(q.year) : "",
      status: q.status,
    });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function updateOption(index: number, value: string) {
    setForm((f) => {
      const opts = [...f.options];
      opts[index] = value;
      return { ...f, options: opts };
    });
  }

  function addOption() {
    setForm((f) => ({ ...f, options: [...f.options, ""] }));
  }

  function removeOption(index: number) {
    setForm((f) => {
      const opts = f.options.filter((_, i) => i !== index);
      const correctAnswer = f.correctAnswer >= opts.length ? 0 : f.correctAnswer;
      return { ...f, options: opts, correctAnswer };
    });
  }

  function handleTypeChange(type: string) {
    if (type === "TRUE_FALSE") {
      setForm((f) => ({ ...f, questionType: type, options: ["True", "False"], correctAnswer: 0 }));
    } else if (type === "MCQ") {
      setForm((f) => ({
        ...f,
        questionType: type,
        options: f.options.length < 4 ? [...f.options, ...Array(4 - f.options.length).fill("")] : f.options.slice(0, Math.max(f.options.length, 4)),
      }));
    } else {
      setForm((f) => ({ ...f, questionType: type }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const body = {
        text: form.text,
        subjectId: form.subjectId,
        questionType: form.questionType,
        options: form.options.filter((o) => o.trim()),
        correctAnswer: form.correctAnswer,
        marks: form.marks,
        difficulty: form.difficulty,
        explanation: form.explanation || null,
        year: form.year ? Number(form.year) : null,
        status: form.status,
      };

      const url = editingId ? `/api/admin/questions/${editingId}` : "/api/admin/questions";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Request failed");
      }

      closeForm();
      await loadQuestions();
      flash(editingId ? "Question updated." : "Question created.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(q: Question) {
    const nextStatus = q.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/admin/questions/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadQuestions();
      flash(`Question ${nextStatus === "PUBLISHED" ? "published" : "unpublished"}.`);
    } catch {
      setError("Failed to update question status.");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(null);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      await loadQuestions();
      flash("Question deleted.");
    } catch {
      setError("Failed to delete question.");
    }
  }

  const filtered = questions.filter((q) => {
    const matchSearch = !search || q.text.toLowerCase().includes(search.toLowerCase());
    const matchSubject = !filterSubject || q.subjectId === filterSubject;
    const matchStatus = !filterStatus || q.status === filterStatus;
    const matchDiff = !filterDifficulty || q.difficulty === filterDifficulty;
    return matchSearch && matchSubject && matchStatus && matchDiff;
  });

  function difficultyBadge(d: string) {
    if (d === "EASY") return "bg-green-100 text-green-700";
    if (d === "MEDIUM") return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  }

  function statusBadge(s: string) {
    if (s === "PUBLISHED") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-700";
  }

  if (status === "loading") {
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

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
          <button
            onClick={openCreate}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create Question
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-400"
              />
            </div>
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className={selectCls}>
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
            <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className={selectCls}>
              <option value="">All Difficulty</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
            {(search || filterSubject || filterStatus || filterDifficulty) && (
              <button
                onClick={() => { setSearch(""); setFilterSubject(""); setFilterStatus(""); setFilterDifficulty(""); }}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Subject", "Text", "Type", "Difficulty", "Status", "Marks", "Created By", "Actions"].map((th) => (
                  <th key={th} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </td>
                </tr>
              )}
              {!loading && questions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-gray-500 mb-4">No questions created yet.</p>
                    <button
                      onClick={openCreate}
                      className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      Create Question
                    </button>
                  </td>
                </tr>
              )}
              {!loading && questions.length > 0 && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No questions match your filters.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {q.subject?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[280px] truncate">
                      {q.text}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {q.questionType}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyBadge(q.difficulty)}`}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(q.status)}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {q.marks}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {q.author?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-3">
                      <button
                        onClick={() => openEdit(q)}
                        className="text-primary hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => togglePublish(q)}
                        className={q.status === "PUBLISHED" ? "text-orange-600 hover:text-orange-800" : "text-green-600 hover:text-green-800"}
                      >
                        {q.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => setDeletingId(q.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && !error && (
            <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              Showing {filtered.length} of {questions.length} question{questions.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
      </main>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm}></div>
          <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId ? "Edit Question" : "Create Question"}
                </h2>
                <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {formError && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <select
                  required
                  value={form.subjectId}
                  onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text *</label>
                <textarea
                  required
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                  className={inputCls}
                  rows={3}
                  placeholder="Enter the question..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                  <select
                    value={form.questionType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className={inputCls}
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="OBJECTIVE">Objective</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
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
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-6">{String.fromCharCode(65 + i)}.</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 ${
                          i === form.correctAnswer ? "border-green-400 ring-1 ring-green-200" : "border-gray-300"
                        }`}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        disabled={form.questionType === "TRUE_FALSE"}
                      />
                      {form.questionType !== "TRUE_FALSE" && form.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="text-red-400 hover:text-red-600 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {form.questionType !== "TRUE_FALSE" && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 text-sm text-primary hover:text-blue-700 font-medium"
                  >
                    + Add Option
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                <select
                  value={form.correctAnswer}
                  onChange={(e) => setForm((f) => ({ ...f, correctAnswer: Number(e.target.value) }))}
                  className={inputCls}
                >
                  {form.options.map((opt, i) => (
                    <option key={i} value={i}>
                      {String.fromCharCode(65 + i)}: {opt || `Option ${String.fromCharCode(65 + i)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={form.marks}
                    onChange={(e) => setForm((f) => ({ ...f, marks: Number(e.target.value) || 1 }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                    className={inputCls}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (optional)</label>
                <textarea
                  value={form.explanation}
                  onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
                  className={inputCls}
                  rows={2}
                  placeholder="Explain the correct answer..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)}></div>
          <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-sm mx-4 p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Question</h2>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
