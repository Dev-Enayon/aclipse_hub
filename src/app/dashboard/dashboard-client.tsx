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

export function DashboardClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/quiz/attempts")
      .then((res) => (res.ok ? res.json() : { attempts: [] }))
      .then((data) => {
        if (!cancelled) setAttempts(Array.isArray(data.attempts) ? data.attempts : []);
      })
      .catch(() => {
        if (!cancelled) setAttempts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Derived stats (null while loading)
  const totalQuizzes = attempts?.length ?? 0;
  const averageScore =
    attempts && totalQuizzes > 0
      ? Math.round(attempts.reduce((sum, a) => sum + percentOf(a), 0) / totalQuizzes)
      : 0;
  const questionsAnswered = attempts?.reduce((sum, a) => sum + a.total, 0) ?? 0;
  const bestScore =
    attempts && totalQuizzes > 0 ? Math.max(...attempts.map(percentOf)) : 0;

  const stats = [
    { label: "Quizzes Taken", value: String(totalQuizzes), color: "text-primary", bg: "bg-blue-50" },
    { label: "Average Score", value: `${averageScore}%`, color: "text-green-600", bg: "bg-green-50" },
    { label: "Questions Answered", value: String(questionsAnswered), color: "text-accent", bg: "bg-orange-50" },
    { label: "Best Score", value: `${bestScore}%`, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  // Average percentage per subject, best first
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
      color: BAR_COLORS[i % BAR_COLORS.length],
    }))
    .sort((x, y) => y.score - x.score);

  const recentActivity = (attempts ?? []).slice(0, 5).map((a) => ({
    action: `Completed ${SUBJECT_LABELS[a.subject] ?? a.subject} quiz${
      a.examType ? ` (${a.examType.toUpperCase()})` : ""
    }`,
    score: `${percentOf(a)}%`,
    time: relativeTime(a.createdAt),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
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
                  Welcome back, {session.user?.name?.split(" ")[0] || "Student"}!
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                  {session.user?.name?.charAt(0) || "S"}
                </span>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{session.user?.name}</p>
                <p className="text-xs text-gray-500">{session.user?.email}</p>
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
          {["overview", "exams", "results"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subject Performance */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Subject Performance</h2>
              </div>
              <div className="p-6">
                {attempts === null ? (
                  <p className="text-sm text-gray-400">Loading your progress…</p>
                ) : subjectPerformance.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-500 mb-4">No quiz results yet.</p>
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
                          <span className="text-sm font-medium text-gray-700">{subject.subject}</span>
                          <span className="text-sm font-semibold text-gray-900">{subject.score}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`${subject.color} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${subject.score}%` }}
                          ></div>
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
                {attempts === null ? (
                  <p className="text-sm text-gray-400">Loading…</p>
                ) : recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-500">Your completed quizzes will appear here.</p>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full mt-2 bg-green-500"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-500">
                            {activity.score} • {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "exams" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Practice Quizzes</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(SUBJECT_LABELS).length > 0 ? ["mathematics", "english", "biology", "physics", "chemistry", "economics"] : []).map(
                  (slug) => (
                    <div
                      key={slug}
                      className="border border-gray-200 rounded-xl p-4 hover:border-primary hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{SUBJECT_LABELS[slug]} Practice</h3>
                          <p className="text-sm text-gray-500">Real past-exam questions</p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-primary">
                          ALOC
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span>You choose 5–20 questions</span>
                      </div>
                      <Link
                        href="/quiz"
                        className="block w-full bg-primary text-white text-center py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Start Quiz
                      </Link>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

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
                  <p className="text-gray-500 mb-4">No quizzes taken yet.</p>
                  <Link
                    href="/quiz"
                    className="inline-block bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Take Your First Quiz
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {attempts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {SUBJECT_LABELS[a.subject] ?? a.subject}
                          {a.examType ? ` (${a.examType.toUpperCase()})` : ""}
                        </h3>
                        <p className="text-sm text-gray-500">{relativeTime(a.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-4">
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
