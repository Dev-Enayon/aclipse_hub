"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface N {
  id: string;
  kind: string;
  subject: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const KIND_LABEL: Record<string, string> = {
  MESSAGE: "Message",
  RESULT_RELEASE: "Result released",
  QUESTION_STATUS: "Question status",
  SYSTEM: "System",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<N[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?take=100");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.notifications ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAll() {
    try {
      await fetch("/api/notifications/read", { method: "POST", body: "{}" });
      setItems((prev) => prev?.map((n) => ({ ...n, readAt: new Date().toISOString() })) ?? null);
    } catch {
      // ignore
    }
  }

  async function openLink(n: N) {
    if (!n.readAt) {
      fetch("/api/notifications/read", { method: "POST", body: JSON.stringify({ ids: [n.id] }) }).catch(() => {});
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) ?? null);
    }
    if (n.link) router.push(n.link);
  }

  const visible = items?.filter((n) => filter === "all" || !n.readAt) ?? [];
  const unreadCount = items?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll} className="text-sm font-medium text-primary hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? "bg-primary text-white" : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {f === "all" ? "All" : "Unread"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {items === null ? (
          <p className="py-12 text-center text-sm text-gray-400">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">No notifications.</p>
        ) : (
          visible.map((n) => (
            <button
              key={n.id}
              onClick={() => openLink(n)}
              className={`block w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors ${n.readAt ? "" : "bg-blue-50/50"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {!n.readAt && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 align-middle" />}
                    {n.subject}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {KIND_LABEL[n.kind] ?? n.kind} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {n.link && (
                  <span className="shrink-0 text-xs font-medium text-primary whitespace-nowrap">Open →</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}