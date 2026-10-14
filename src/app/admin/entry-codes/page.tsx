"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";

interface EntryCode {
  id: string;
  code: string;
  cbtId: string | null;
  studentName: string | null;
  status: "UNUSED" | "USED" | "REVOKED";
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
  exam?: { id: string; title: string } | null;
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-400";

const STATUS_BADGE: Record<EntryCode["status"], string> = {
  UNUSED: "bg-green-100 text-green-700",
  USED: "bg-blue-100 text-blue-700",
  REVOKED: "bg-gray-100 text-gray-500",
};

export default function AdminEntryCodesPage() {
  const [codes, setCodes] = useState<EntryCode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [count, setCount] = useState("10");
  const [cbtId, setCbtId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/entry-codes");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setCodes(data.codes ?? []);
    } catch {
      setError("Failed to load entry codes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/entry-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: Number(count) || 10,
          cbtId: cbtId || undefined,
          studentName: studentName || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Failed to create codes");
      await load();
      flash(`Created ${count || 10} entry code${Number(count) === 1 ? "" : "s"}.`);
      setStudentName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create codes.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(code: EntryCode) {
    if (!window.confirm(`Revoke ${code.code}? Only unused codes can be revoked.`)) return;
    setRevokingId(code.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/entry-codes/${code.id}`, { method: "PATCH" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Failed to revoke");
      await load();
      flash(`${code.code} revoked.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke.");
    } finally {
      setRevokingId(null);
    }
  }

  const usedCount = codes?.filter((c) => c.status === "USED").length ?? 0;
  const unusedCount = codes?.filter((c) => c.status === "UNUSED").length ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Entry Codes</h1>
        <p className="text-gray-500 text-sm mt-1">
          Issue entry codes to students so they can start CBTs. Students enter their name plus the code on the CBT page.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-6">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500 mb-1">Total issued</p>
          <p className="text-2xl font-bold text-gray-900">{codes?.length ?? "—"}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <p className="text-sm text-green-700 mb-1">Unused</p>
          <p className="text-2xl font-bold text-green-800">{unusedCount}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-sm text-blue-700 mb-1">Used</p>
          <p className="text-2xl font-bold text-blue-800">{usedCount}</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Issue new entry codes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of codes *</label>
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              required
              className={inputCls}
              placeholder="10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked CBT ID (optional)</label>
            <input value={cbtId} onChange={(e) => setCbtId(e.target.value)} className={inputCls} placeholder="Exam/CBT id" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student name (optional)</label>
            <input value={studentName} onChange={(e) => setStudentName(e.target.value)} className={inputCls} placeholder="e.g. Ada Obi" />
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
        >
          {creating ? "Issuing..." : "Issue codes"}
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : !codes || codes.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">No entry codes issued yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">CBT</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Used</th>
                  <th className="px-5 py-3 font-medium">Issued</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-4 font-mono font-medium text-gray-900">{c.code}</td>
                    <td className="px-5 py-4 text-gray-600">{c.studentName ?? "—"}</td>
                    <td className="px-5 py-4 text-gray-600">{c.exam?.title ?? c.cbtId ?? "Any"}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                        {c.status === "UNUSED" ? "Unused" : c.status === "USED" ? "Used" : "Revoked"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {c.usedAt ? new Date(c.usedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {new Date(c.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {c.status === "UNUSED" && (
                        <button
                          onClick={() => handleRevoke(c)}
                          disabled={revokingId === c.id}
                          className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                        >
                          {revokingId === c.id ? "Revoking..." : "Revoke"}
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