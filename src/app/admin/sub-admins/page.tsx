"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";

interface SubAdmin {
  id: string;
  email: string;
  name: string;
  department: string | null;
  status: "ACTIVE" | "SUSPENDED";
  questionCount: number;
  createdAt: string;
  lastLoginAt: string | null;
}

interface Response {
  subAdmins: SubAdmin[];
  activeCount: number;
  limit: number;
  slotsLeft: number;
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-400";

export default function AdminSubAdminsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sub-admins");
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
    } catch {
      setError("Failed to load Sub-Admins.");
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
      const res = await fetch("/api/admin/sub-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, department: department || undefined }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Failed to create");
      await load();
      setShowCreate(false);
      setName("");
      setEmail("");
      setPassword("");
      setDepartment("");
      flash("Sub-Admin created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create.");
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sub-admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed");
      }
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggle(sub: SubAdmin) {
    if (await patch(sub.id, { action: sub.status === "ACTIVE" ? "suspend" : "reactivate" })) {
      flash(sub.status === "ACTIVE" ? `${sub.name} suspended.` : `${sub.name} reactivated.`);
    }
  }

  async function handleResetPassword(sub: SubAdmin) {
    const newPassword = window.prompt(`New password for ${sub.name} (minimum 8 characters):`);
    if (!newPassword) return;
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (await patch(sub.id, { password: newPassword })) {
      flash("Password updated.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const slotsLeft = data?.slotsLeft ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sub-Admins</h1>
          <p className="text-gray-500 text-sm mt-1">Manage question-setting Sub-Admins (max 6 active system-wide).</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          disabled={slotsLeft === 0}
          className="mt-3 sm:mt-0 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + New Sub-Admin
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-6">{success}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Active Sub-Admin slots</span>
          <span className="text-sm font-semibold text-primary">
            {data?.activeCount ?? 0} / {data?.limit ?? 6}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-primary rounded-full h-3 transition-all duration-300"
            style={{ width: `${Math.min(100, ((data?.activeCount ?? 0) / (data?.limit ?? 6)) * 100)}%` }}
          />
        </div>
        {slotsLeft === 0 && (
          <p className="text-sm text-amber-700 mt-3">
            The maximum number of active Sub-Admins has been reached. Suspend one to free a slot.
          </p>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Create Sub-Admin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="e.g. Precious Question" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} placeholder="subadmin@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password * (min 8 characters)</label>
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={inputCls} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department (optional)</label>
              <input value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls} placeholder="e.g. Sciences" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={creating} className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60">
              {creating ? "Creating..." : "Create"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {(!data?.subAdmins || data.subAdmins.length === 0) ? (
          <div className="text-center py-12 text-gray-500 text-sm">No Sub-Admins yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                  <th className="px-5 py-3 font-medium">Sub-Admin</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Questions</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Last Login</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.subAdmins.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.email}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{s.department ?? "—"}</td>
                    <td className="px-5 py-4 text-gray-700">{s.questionCount}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {s.status === "ACTIVE" ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : "Never"}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleToggle(s)}
                        disabled={busyId === s.id}
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-50 mr-3"
                      >
                        {s.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </button>
                      <button
                        onClick={() => handleResetPassword(s)}
                        disabled={busyId === s.id || s.status !== "ACTIVE"}
                        className="text-xs font-medium text-gray-500 hover:underline disabled:opacity-50"
                      >
                        Reset password
                      </button>
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