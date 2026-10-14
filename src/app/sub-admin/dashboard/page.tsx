"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface OwnQuestion {
  id: string;
  text: string;
  subjectName: string;
  difficulty: string;
  status: string;
  createdAt: string;
}

interface DashboardStats {
  total: number;
  draft: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  published: number;
}

interface CbtItem {
  id: string;
  title: string;
  status: string;
}

const TIERS = [
  { code: "JSS1", label: "JSS 1", desc: "Junior Secondary 1" },
  { code: "JSS2", label: "JSS 2", desc: "Junior Secondary 2" },
  { code: "JSS3", label: "JSS 3", desc: "Junior Secondary 3" },
  { code: "SS1", label: "SS 1", desc: "Senior Secondary 1" },
  { code: "SS2", label: "SS 2", desc: "Senior Secondary 2" },
  { code: "SS3", label: "SS 3", desc: "Senior Secondary 3" },
];

const TIER_COLORS = [
  "bg-blue-50 border-blue-100 hover:bg-blue-100",
  "bg-teal-50 border-teal-100 hover:bg-teal-100",
  "bg-purple-50 border-purple-100 hover:bg-purple-100",
  "bg-orange-50 border-orange-100 hover:bg-orange-100",
  "bg-pink-50 border-pink-100 hover:bg-pink-100",
  "bg-green-50 border-green-100 hover:bg-green-100",
];

const CBT_STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-700",
  PENDING_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  PUBLISHED: "bg-teal-100 text-teal-700",
  REJECTED: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-700",
  PENDING_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  PUBLISHED: "bg-teal-100 text-teal-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

export default function SubAdminDashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    draft: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    published: 0,
  });
  const [recent, setRecent] = useState<OwnQuestion[]>([]);
  const [cbts, setCbts] = useState<CbtItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, cbtRes] = await Promise.all([
        fetch("/api/sub-admin/questions"),
        fetch("/api/sub-admin/cbts"),
      ]);
      if (!qRes.ok || !cbtRes.ok) throw new Error(String(qRes.status));
      const data = await qRes.json();
      const questions: OwnQuestion[] = data.questions ?? [];
      const count = (s: string) => questions.filter((q) => q.status === s).length;
      setStats({
        total: questions.length,
        draft: count("DRAFT"),
        pendingReview: count("PENDING_REVIEW"),
        approved: count("APPROVED"),
        rejected: count("REJECTED"),
        published: count("PUBLISHED"),
      });
      setRecent(questions.slice(0, 6));
      const cbtData = await cbtRes.json();
      setCbts(Array.isArray(cbtData.cbts) ? cbtData.cbts : []);
    } catch {
      // stats stay at zero
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") load();
  }, [sessionStatus, load]);

  const cards = [
    { label: "Total Questions", value: stats.total, cls: "bg-primary/10 text-primary" },
    { label: "Drafts", value: stats.draft, cls: "bg-yellow-100 text-yellow-700" },
    { label: "Pending Review", value: stats.pendingReview, cls: "bg-blue-100 text-blue-700" },
    { label: "Approved", value: stats.approved, cls: "bg-green-100 text-green-700" },
    { label: "Returned (Rejected)", value: stats.rejected, cls: "bg-red-100 text-red-700" },
    { label: "Published", value: stats.published, cls: "bg-teal-100 text-teal-700" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {session?.user?.name ?? "Sub-Admin"} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Create objective questions, refine them from feedback, and submit them for Head Admin review.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {cards.map((c) => (
              <div key={c.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <span className={`inline-block w-8 h-8 rounded-lg text-sm font-semibold flex items-center justify-center ${c.cls}`}>
                  {c.value}
                </span>
                <p className="mt-3 text-sm font-medium text-gray-700">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Build a CBT for a section</h2>
                <p className="text-sm text-gray-500 mt-0.5">Pick the school section for students. Set the exam type (CBT or JAMB-style) when you create it.</p>
              </div>
              <Link
                href="/sub-admin/cbts/create"
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors"
              >
                + New CBT
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {TIERS.map((t, i) => (
                <Link
                  key={t.code}
                  href={`/sub-admin/cbts/create?tier=${t.code}`}
                  className={`rounded-xl border p-4 transition-all ${TIER_COLORS[i % TIER_COLORS.length]}`}
                >
                  <p className="font-bold text-gray-900">{t.label}</p>
                  <p className="text-xs text-gray-600 mt-1">{t.desc}</p>
                </Link>
              ))}
            </div>
            <div className="flex gap-3 mt-3">
              <Link
                href="/sub-admin/cbts/create?type=CBT"
                className="rounded-xl border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 p-4 flex-1 transition-all"
              >
                <p className="font-bold text-gray-900">CBT</p>
                <p className="text-xs text-gray-600 mt-1">Computer-Based Test format</p>
              </Link>
              <Link
                href="/sub-admin/cbts/create?type=JAMB"
                className="rounded-xl border border-amber-100 bg-amber-50 hover:bg-amber-100 p-4 flex-1 transition-all"
              >
                <p className="font-bold text-gray-900">JAMB</p>
                <p className="text-xs text-gray-600 mt-1">UTME practice format</p>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My CBTs</h2>
              <Link href="/sub-admin/cbts" className="text-sm font-medium text-primary hover:underline">
                View all →
              </Link>
            </div>
            {cbts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                You have not created any CBTs yet. Pick a section above to get started.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cbts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/sub-admin/cbts/${c.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-50 hover:bg-gray-100"
                  >
                    <span className={`px-2 py-0.5 rounded-full ${CBT_STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-gray-700 truncate max-w-[140px]">{c.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Questions</h2>
              <Link
                href="/sub-admin/questions/create"
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors"
              >
                Create Question
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                <p className="mb-3">No questions yet.</p>
                <Link href="/sub-admin/questions/create" className="text-primary font-medium hover:underline">
                  Create your first question
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map((q) => (
                  <div key={q.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 truncate">{q.text}</p>
                      <p className="text-xs text-gray-500">{q.subjectName}</p>
                    </div>
                    <span className={`ml-4 flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[q.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[q.status] ?? q.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}