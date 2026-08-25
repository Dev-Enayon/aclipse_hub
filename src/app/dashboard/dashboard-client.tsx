"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface QuizAttempt {
  id: string;
  subject: string;
  examType: string;
  total: number;
  score: number;
  createdAt: string;
}

interface Activity {
  id: string;
  type: string;
  subject: string | null;
  details: string;
  createdAt: string;
}

function percentOf(a: QuizAttempt): number {
  return a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

const SUBJECT_LABELS: Record<string, string> = {
  english: "English",
  mathematics: "Mathematics",
  commerce: "Commerce",
  accounting: "Accounting",
  biology: "Biology",
  physics: "Physics",
  chemistry: "Chemistry",
  englishlit: "English Literature",
  government: "Government",
  crk: "CRK",
  geography: "Geography",
  economics: "Economics",
  irk: "IRK",
  civiledu: "Civic Education",
  insurance: "Insurance",
  currentaffairs: "Current Affairs",
  history: "History",
};

const BAR_COLORS = ["bg-blue-500", "bg-green-500", "bg-orange-500", "bg-purple-500", "bg-pink-500", "bg-teal-500"];

function activityLabel(a: Activity): string {
  const subject = a.subject ? (SUBJECT_LABELS[a.subject] ?? a.subject) : "";
  let details: Record<string, unknown> = {};
  try { details = JSON.parse(a.details); } catch { /* ignore */ }

  switch (a.type) {
    case "quiz_completed": {
      const score = typeof details.score === "number" && typeof details.total === "number" && details.total > 0
        ? ` — ${Math.round((details.score / details.total) * 100)}%`
        : "";
      return `Completed ${subject} quiz${score}`;
    }
    case "quiz_started":
      return `Started a ${subject} quiz`;
    case "profile_completed":
      return "Completed your profile";
    default:
      return a.type.replace(/_/g, " ");
  }
}

export function DashboardClient({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const [activities, setActivities] = useState<Activity[] | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    Promise.all([
      fetch("/api/quiz/attempts").then((r) => (r.ok ? r.json() : { attempts: [] })),
      fetch("/api/student/activity").then((r) => (r.ok ? r.json() : { activities: [] })),
    ])
      .then(([quizData, actData]) => {
        if (cancelled) return;
        setAttempts(Array.isArray(quizData.attempts) ? quizData.attempts : []);
        setActivities(Array.isArray(actData.activities) ? actData.activities : []);
      })
      .catch(() => {
        if (cancelled) return;
        setAttempts([]);
        setActivities([]);
      });
    return () => { cancelled = true; };
  }, [status]);

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const firstName = userName.split(" ")[0] || "Student";
  const totalQuizzes = attempts?.length ?? 0;
  const averageScore = attempts && totalQuizzes > 0
    ? Math.round(attempts.reduce((sum, a) => sum + percentOf(a), 0) / totalQuizzes)
    : 0;
  const questionsAnswered = attempts?.reduce((sum, a) => sum + a.total, 0) ?? 0;
  const bestScore = attempts && totalQuizzes > 0 ? Math.max(...attempts.map(percentOf)) : 0;

  const stats = [
    { label: "Quizzes Taken", value: String(totalQuizzes), color: "text-primary", bg: "bg-blue-50" },
    { label: "Average Score", value: totalQuizzes > 0 ? `${averageScore}%` : "—", color: "text-green-600", bg: "bg-green-50" },
    { label: "Questions Answered", value: String(questionsAnswered), color: "text-accent", bg: "bg-orange-50" },
    { label: "Best Score", value: totalQuizzes > 0 ? `${bestScore}%` : "—", color: "text-purple-600", bg: "bg-purple-50" },
  ];

  // Subject performance from real quiz attempts
  const subjectMap = new Map<string, { sum: number; n: number }>();
  for (const a of attempts ?? []) {
    const entry = subjectMap.get(a.subject) ?? { sum: 0, n: 0 };
    entry.sum += percentOf(a);
    entry.n += 1;
    subjectMap.set(a.subject, entry);
  }
  const subjectPerformance = [...subjectMap.entries()]
    .map(([subject, { sum, n }], i) => ({
      subject: SUBJECT_LABELS[subject] ?? subject,
      score: Math.round(sum / n),
      count: n,
      color: BAR_COLORS[i % BAR_COLORS.length],
    }))
    .sort((x, y) => y.score - x.score);

  // Recent activity from real Activity log
  const recentActivity = (activities ?? []).slice(0, 8);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Logo className="w-8 h-8 rounded-lg" />
                <span className="text-xl font-bold text-gray-900 hidden sm:block">Aclipse Hub</span>
              </Link>
              <div className="hidden md:block h-8 w-px bg-gray-200"></div>
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-gray-900">
                  Welcome back, {firstName}!
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold">{firstName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{userEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`${stat.bg} rounded-xl p-4 border border-gray-100`}>
              <div className="text-sm text-gray-500 mb-1">{stat.label}</div>
              <div className={`text-2xl lg:text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(["overview", "results"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab === "overview" ? "Overview" : "Quiz History"}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subject Performance */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Subject Performance</h2>
              </div>
              <div className="p-6">
                {attempts === null ? (
                  <p className="text-sm text-gray-400">Loading…</p>
                ) : subjectPerformance.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium mb-1">No performance data yet</p>
                    <p className="text-sm text-gray-500 mb-4">Take a quiz to start tracking your progress.</p>
                    <Link
                      href="/quiz"
                      className="inline-block bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Take Your First Quiz
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subjectPerformance.map((subject) => (
                      <div key={subject.subject}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {subject.subject}
                            <span className="text-gray-400 ml-1">({subject.count} quiz{subject.count === 1 ? "" : "es"})</span>
                          </span>
                          <span className="text-sm font-semibold text-gray-900">{subject.score}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`${subject.color} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${subject.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="p-6">
                {activities === null ? (
                  <p className="text-sm text-gray-400">Loading…</p>
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">Your activity will appear here once you start using the platform.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          activity.type === "quiz_completed" ? "bg-green-500" :
                          activity.type === "quiz_started" ? "bg-blue-500" :
                          "bg-gray-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{activityLabel(activity)}</p>
                          <p className="text-xs text-gray-500">{relativeTime(activity.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quiz History Tab */}
        {activeTab === "results" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Quiz History</h2>
            </div>
            <div className="p-6">
              {attempts === null ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : attempts.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No quizzes taken yet</p>
                  <p className="text-sm text-gray-500 mb-4">Your completed quizzes will appear here.</p>
                  <Link
                    href="/quiz"
                    className="inline-block bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Take Your First Quiz
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {attempts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900">
                          {SUBJECT_LABELS[a.subject] ?? a.subject}
                          {a.examType ? ` (${a.examType.toUpperCase()})` : ""}
                        </h3>
                        <p className="text-sm text-gray-500">{relativeTime(a.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-lg font-bold text-primary">{percentOf(a)}%</span>
                        <span className="text-sm text-gray-500">
                          {a.score}/{a.total}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
