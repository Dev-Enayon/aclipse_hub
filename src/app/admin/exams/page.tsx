"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Subject {
  id: string;
  name: string;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  subjectId: string;
  subjectName: string;
  timer: number;
  passingScore: number;
  totalMarks: number;
  status: string;
  createdBy: string;
  authorName: string | null;
  questionCount: number;
  attemptCount: number;
  createdAt: string;
}

interface Question {
  id: string;
  text: string;
  subjectId: string;
  subject: Subject | null;
  difficulty: string;
  questionType: string;
  marks: number;
  status: string;
}

interface ExamForm {
  title: string;
  subjectId: string;
  description: string;
  timer: number;
  passingScore: number;
  totalMarks: number;
  status: string;
  questionIds: string[];
}

const emptyForm: ExamForm = {
  title: "",
  subjectId: "",
  description: "",
  timer: 60,
  passingScore: 50,
  totalMarks: 60,
  status: "DRAFT",
  questionIds: [],
};

const inputCls =
  "w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-400";

export default function ExamsPage() {
  const { status: sessionStatus } = useSession();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [filterSubject, setFilterSubject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExamForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState("");

  useEffect(() => {
    if (sessionStatus === "unauthenticated") window.location.href = "/login";
  }, [sessionStatus]);

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/exams");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setExams(data.exams);
    } catch {
      setError("Failed to load exams.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/questions");
      if (!res.ok) return;
      const data = await res.json();
      setAllQuestions(data.questions);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      loadExams();
      loadQuestions();
    }
  }, [sessionStatus, loadExams, loadQuestions]);

  const subjects: Subject[] = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const q of allQuestions) {
      if (q.subject && !map.has(q.subject.id)) map.set(q.subject.id, q.subject);
    }
    for (const e of exams) {
      if (e.subjectId && e.subjectName && !map.has(e.subjectId)) {
        map.set(e.subjectId, { id: e.subjectId, name: e.subjectName });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allQuestions, exams]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setQuestionSearch("");
    setQuestionSubjectFilter("");
    setShowForm(true);
  }

  function openEdit(exam: Exam) {
    setEditingId(exam.id);
    setForm({
      title: exam.title,
      subjectId: exam.subjectId,
      description: exam.description ?? "",
      timer: exam.timer,
      passingScore: exam.passingScore,
      totalMarks: exam.totalMarks,
      status: exam.status,
      questionIds: [],
    });
    setFormError(null);
    setQuestionSearch("");
    setQuestionSubjectFilter(exam.subjectId);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  }

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (form.subjectId && q.subjectId !== form.subjectId) return false;
      if (questionSubjectFilter && q.subjectId !== questionSubjectFilter) return false;
      if (questionSearch && !q.text.toLowerCase().includes(questionSearch.toLowerCase())) return false;
      return true;
    });
  }, [allQuestions, form.subjectId, questionSubjectFilter, questionSearch]);

  function toggleQuestion(id: string) {
    setForm((f) => {
      const ids = f.questionIds.includes(id)
        ? f.questionIds.filter((i) => i !== id)
        : [...f.questionIds, id];
      return { ...f, questionIds: ids };
    });
  }

  function selectAllVisible() {
    setForm((f) => {
      const visibleIds = filteredQuestions.map((q) => q.id);
      const merged = new Set([...f.questionIds, ...visibleIds]);
      return { ...f, questionIds: Array.from(merged) };
    });
  }

  function deselectAllVisible() {
    setForm((f) => {
      const visibleIds = new Set(filteredQuestions.map((q) => q.id));
      return { ...f, questionIds: f.questionIds.filter((id) => !visibleIds.has(id)) };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        title: form.title,
        subjectId: form.subjectId,
        description: form.description || null,
        timer: form.timer,
        passingScore: form.passingScore,
        totalMarks: form.totalMarks,
      };
      if (editingId) {
        body.status = form.status;
        if (form.questionIds.length > 0) body.questionIds = form.questionIds;
      } else {
        body.questionIds = form.questionIds;
      }

      const url = editingId ? `/api/admin/exams/${editingId}` : "/api/admin/exams";
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
      await loadExams();
      flash(editingId ? "Exam updated." : "Exam created.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(exam: Exam) {
    const nextStatus = exam.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/admin/exams/${exam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadExams();
      flash(`Exam ${nextStatus === "PUBLISHED" ? "published" : "unpublished"}.`);
    } catch {
      setError("Failed to update exam status.");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(null);
    try {
      const res = await fetch(`/api/admin/exams/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      await loadExams();
      flash("Exam deleted.");
    } catch {
      setError("Failed to delete exam.");
    }
  }

  const filtered = exams.filter((e) => {
    const matchSubject = !filterSubject || e.subjectId === filterSubject;
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSubject && matchStatus;
  });

  function statusBadge(s: string) {
    if (s === "PUBLISHED") return "bg-green-100 text-green-700";
    if (s === "DRAFT") return "bg-gray-100 text-gray-700";
    return "bg-red-100 text-red-700";
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

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Examinations</h1>
          <button
            onClick={openCreate}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create Exam
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
            {(filterSubject || filterStatus) && (
              <button
                onClick={() => { setFilterSubject(""); setFilterStatus(""); }}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Title", "Subject", "Questions", "Attempts", "Status", "Timer", "Passing Score", "Created By", "Actions"].map((th) => (
                  <th key={th} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </td>
                </tr>
              )}
              {!loading && exams.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <p className="text-gray-500 mb-4">No exams created yet.</p>
                    <button
                      onClick={openCreate}
                      className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      Create Exam
                    </button>
                  </td>
                </tr>
              )}
              {!loading && exams.length > 0 && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No exams match your filters.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate">{exam.title}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {exam.subjectName}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {exam.questionCount}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {exam.attemptCount}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(exam.status)}`}>
                        {exam.status === "PUBLISHED" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {exam.timer} min
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {exam.passingScore}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {exam.authorName ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-3">
                      <button
                        onClick={() => openEdit(exam)}
                        className="text-primary hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => togglePublish(exam)}
                        className={exam.status === "PUBLISHED" ? "text-orange-600 hover:text-orange-800" : "text-green-600 hover:text-green-800"}
                      >
                        {exam.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => setDeletingId(exam.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && !error && (
            <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              Showing {filtered.length} of {exams.length} exam{exams.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
      </main>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm}></div>
          <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId ? "Edit Exam" : "Create New Exam"}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={inputCls}
                  placeholder="Enter exam title..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <select
                    required
                    value={form.subjectId}
                    onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value, questionIds: [] }))}
                    className={inputCls}
                  >
                    <option value="">Select subject...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={inputCls}
                  rows={2}
                  placeholder="Enter exam description (optional)..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timer (minutes)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.timer}
                    onChange={(e) => setForm((f) => ({ ...f, timer: Number(e.target.value) || 60 }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.passingScore}
                    onChange={(e) => setForm((f) => ({ ...f, passingScore: Number(e.target.value) || 50 }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={form.totalMarks}
                    onChange={(e) => setForm((f) => ({ ...f, totalMarks: Number(e.target.value) || 60 }))}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Question Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Questions
                  {form.questionIds.length > 0 && (
                    <span className="ml-2 text-primary font-semibold">({form.questionIds.length} selected)</span>
                  )}
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Search questions..."
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                    />
                    <select
                      value={questionSubjectFilter}
                      onChange={(e) => setQuestionSubjectFilter(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="">All Subjects</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={selectAllVisible}
                        className="px-2 py-1 text-xs font-medium text-primary hover:text-blue-700 border border-gray-300 rounded-lg bg-white"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllVisible}
                        className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg bg-white"
                      >
                        Deselect
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[240px] overflow-y-auto divide-y divide-gray-100">
                    {filteredQuestions.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        No questions available for the selected filters.
                      </div>
                    )}
                    {filteredQuestions.map((q) => {
                      const checked = form.questionIds.includes(q.id);
                      return (
                        <label
                          key={q.id}
                          className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${checked ? "bg-blue-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleQuestion(q.id)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{q.text}</p>
                            <div className="flex gap-2 mt-0.5">
                              <span className="text-xs text-gray-500">{q.subject?.name ?? "—"}</span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-500">{q.difficulty}</span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-500">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
                    {filteredQuestions.length} question{filteredQuestions.length !== 1 ? "s" : ""} available
                    {form.questionIds.length > 0 && (
                      <span> · {form.questionIds.length} selected</span>
                    )}
                  </div>
                </div>
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
                  {saving ? "Saving..." : editingId ? "Update Exam" : "Create Exam"}
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
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Exam</h2>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to delete this exam? This action cannot be undone.
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
