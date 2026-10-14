"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Subject { id: string; name: string; }
interface QuestionOpt {
  id: string;
  text: string;
  subjectName: string;
  examType: string;
  schoolTier: string | null;
  difficulty: string;
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-400";
const selectCls = inputCls;

const TIERS = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];

export function CbtForm({
  mode,
  existing,
  onSave,
  extraActions,
}: {
  mode: "create" | "edit";
  existing?: {
    id: string;
    title: string;
    description: string | null;
    subjectId: string;
    schoolTier: string | null;
    examType: string;
    timer: number;
    status: string;
    questionIds: string[];
  };
  onSave: (payload: Record<string, unknown>) => Promise<boolean>;
  extraActions?: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<QuestionOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [subjectId, setSubjectId] = useState(existing?.subjectId ?? "");
  const [schoolTier, setSchoolTier] = useState(existing?.schoolTier ?? searchParams.get("tier") ?? "");
  const [examType, setExamType] = useState(existing?.examType ?? searchParams.get("type") ?? "CBT");
  const [timer, setTimer] = useState(String(existing?.timer ?? 60));
  const [selected, setSelected] = useState<Set<string>>(new Set(existing?.questionIds ?? []));
  const [qFilter, setQFilter] = useState<{ tier: string; type: string; subjectId: string }>({
    tier: "",
    type: "",
    subjectId: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subjectsRes, qRes] = await Promise.all([
        fetch("/api/sub-admin/subjects"),
        fetch("/api/sub-admin/questions?status=APPROVED,PUBLISHED"),
      ]);
      if (!subjectsRes.ok || !qRes.ok) throw new Error(String(subjectsRes.status));
      const sData = await subjectsRes.json();
      const qData = await qRes.json();
      setSubjects(sData.subjects ?? []);
      const list: QuestionOpt[] = (qData.questions ?? []).map((q: QuestionOpt) => q);
      setQuestions(list);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (qFilter.tier && (q.schoolTier ?? "") !== qFilter.tier) return false;
      if (qFilter.type && q.examType !== qFilter.type) return false;
      if (qFilter.subjectId && qFilter.subjectId !== "all") {
        const name = subjects.find((s) => s.id === qFilter.subjectId)?.name;
        if (name && q.subjectName !== name) return false;
      }
      return true;
    });
  }, [questions, qFilter, subjects]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredQuestions.forEach((q) => next.add(q.id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  async function save() {
    setError(null);
    setSuccess(null);
    if (!title.trim()) { setError("Title is required."); return; }
    if (!subjectId) { setError("Choose a subject."); return; }
    if (selected.size === 0) { setError("Select at least one question."); return; }
    setSaving(true);
    const ok = await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      subjectId,
      schoolTier: schoolTier || undefined,
      examType,
      timer: Number(timer) || 60,
      questionIds: [...selected],
    });
    setSaving(false);
    if (!ok) return false;
    setSuccess("Saved.");
    return true;
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">{success}</div>}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">CBT details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. JSS2 Mathematics CBT – Term 1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} placeholder="Short description shown to students" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Timer (minutes, 5–240)</label>
                <input type="number" min={5} max={240} value={timer} onChange={(e) => setTimer(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Section</label>
                <select value={schoolTier} onChange={(e) => setSchoolTier(e.target.value)} className={selectCls}>
                  <option value="">All sections (general)</option>
                  {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
                <select value={examType} onChange={(e) => setExamType(e.target.value)} className={selectCls}>
                  <option value="CBT">CBT (Computer-Based Test)</option>
                  <option value="JAMB">JAMB (UTME practice)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Questions ({selected.size} selected)</h2>
                <p className="text-sm text-gray-500 mt-0.5">Pick from your approved questions. Filter by section, type or subject.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={selectAllVisible} className="text-xs font-medium text-primary hover:underline">Select all shown</button>
                <button onClick={clearSelection} className="text-xs font-medium text-gray-500 hover:underline">Clear</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <select value={qFilter.tier} onChange={(e) => setQFilter((f) => ({ ...f, tier: e.target.value }))} className={selectCls}>
                <option value="">All sections</option>
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={qFilter.type} onChange={(e) => setQFilter((f) => ({ ...f, type: e.target.value }))} className={selectCls}>
                <option value="">All exam types</option>
                <option value="CBT">CBT</option>
                <option value="JAMB">JAMB</option>
              </select>
              <select value={qFilter.subjectId} onChange={(e) => setQFilter((f) => ({ ...f, subjectId: e.target.value }))} className={selectCls}>
                <option value="all">All subjects</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {filteredQuestions.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-500">
                No approved questions match these filters yet.
                <div className="mt-2">
                  <Link href="/sub-admin/questions/create" className="text-primary font-medium hover:underline">
                    Create a question
                  </Link>
                </div>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                {filteredQuestions.map((q) => (
                  <label key={q.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(q.id)}
                      onChange={() => toggleSelect(q.id)}
                      className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800">{q.text}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {q.subjectName}
                        {q.schoolTier ? ` · ${q.schoolTier}` : " · General"} · {q.examType} · {q.difficulty}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={async () => { if (await save()) setTimeout(() => router.push("/sub-admin/cbts"), 800); }}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "create" ? "Create CBT" : "Save changes"}
            </button>
            {extraActions}
            <Link href="/sub-admin/cbts" className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-center">
              Cancel
            </Link>
          </div>
        </>
      )}
    </div>
  );
}