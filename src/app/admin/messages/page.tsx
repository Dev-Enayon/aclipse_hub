"use client";

import { useEffect, useState } from "react";

interface Recipient {
  id: string;
  name: string | null;
  email: string;
  department?: string | null;
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-400";

const TARGET_GROUPS = [
  { value: "STUDENT", label: "All Students" },
  { value: "SUB_ADMIN", label: "All Sub-Admins" },
  { value: "ADMIN", label: "All Administrators" },
  { value: "SUPER_ADMIN", label: "Head Admin only" },
  { value: "ALL_ADMINS", label: "All Admin staff" },
];

export default function AdminMessagesPage() {
  const [subAdmins, setSubAdmins] = useState<Recipient[]>([]);
  const [students, setStudents] = useState<Recipient[]>([]);
  const [target, setTarget] = useState("STUDENT");
  const [userId, setUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/messages/recipients")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setSubAdmins(d.subAdmins ?? []);
          setStudents(d.students ?? []);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          userId: target.startsWith("single:") ? userId : undefined,
          subject,
          message,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Failed to send");
      setSuccess(`Message sent to ${body.created ?? 0} recipient(s) in-app${body.emailed ? ` + ${body.emailed} email(s)` : ""}.`);
      setSubject("");
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  }

  const options = [...TARGET_GROUPS, ...[...subAdmins.map((s) => ({ value: `single:${s.id}`, label: `Sub-Admin: ${s.name ?? s.email}` })), ...students.map((s) => ({ value: `single:${s.id}`, label: `Student: ${s.name ?? s.email}` }))]];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Send Message</h1>
        <p className="text-gray-500 text-sm mt-1">
          Message students or Sub-Admins. Delivered as in-app notifications and emailed when email is configured.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-6">{success}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipients *</label>
            <select
              value={userId ? `single:${userId}` : target}
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith("single:")) {
                  setTarget("single:" + v.slice(7));
                  setUserId(v.slice(7));
                } else {
                  setTarget(v);
                  setUserId("");
                }
              }}
              className={inputCls}
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject * (max 120 chars)</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} required className={inputCls} placeholder="e.g. CBT schedule for next week" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={4000}
            required
            rows={6}
            className={inputCls}
            placeholder="Type your message here..."
          />
        </div>
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">{message.length}/4000</p>
          <button
            type="submit"
            disabled={sending}
            className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send message"}
          </button>
        </div>
      </form>
    </div>
  );
}