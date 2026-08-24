"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export function DashboardClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

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

  const stats = [
    { label: "Available Exams", value: "12", color: "text-primary", bg: "bg-blue-50" },
    { label: "Completed", value: "8", color: "text-green-600", bg: "bg-green-50" },
    { label: "Average Score", value: "76%", color: "text-accent", bg: "bg-orange-50" },
    { label: "Rank", value: "#42", color: "text-purple-600", bg: "bg-purple-50" },
  ];

  const exams = [
    {
      id: 1,
      title: "Mathematics Mock Exam",
      subject: "Mathematics",
      questions: 40,
      time: "60 min",
      difficulty: "Medium",
      progress: 0,
    },
    {
      id: 2,
      title: "Physics Practice Test",
      subject: "Physics",
      questions: 30,
      time: "45 min",
      difficulty: "Hard",
      progress: 0,
    },
    {
      id: 3,
      title: "Chemistry Quiz",
      subject: "Chemistry",
      questions: 25,
      time: "30 min",
      difficulty: "Easy",
      progress: 0,
    },
    {
      id: 4,
      title: "Biology Assessment",
      subject: "Biology",
      questions: 35,
      time: "50 min",
      difficulty: "Medium",
      progress: 0,
    },
  ];

  const recentActivity = [
    {
      action: "Completed Mathematics Quiz",
      score: "85%",
      time: "2 hours ago",
      type: "completed",
    },
    {
      action: "Started Physics Exam",
      score: "In progress",
      time: "5 hours ago",
      type: "in-progress",
    },
    {
      action: "Completed Chemistry Test",
      score: "72%",
      time: "1 day ago",
      type: "completed",
    },
    {
      action: "Completed Biology Quiz",
      score: "91%",
      time: "2 days ago",
      type: "completed",
    },
  ];

  const subjectPerformance = [
    { subject: "Mathematics", score: 85, color: "bg-blue-500" },
    { subject: "Physics", score: 72, color: "bg-green-500" },
    { subject: "Chemistry", score: 68, color: "bg-orange-500" },
    { subject: "Biology", score: 91, color: "bg-purple-500" },
  ];

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
                <div className="space-y-4">
                  {subjectPerformance.map((subject, index) => (
                    <div key={index}>
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
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === "completed" ? "bg-green-500" : "bg-yellow-500"
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500">
                          {activity.score} • {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "exams" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Available Exams</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-primary hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                        <p className="text-sm text-gray-500">{exam.subject}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        exam.difficulty === "Easy"
                          ? "bg-green-100 text-green-700"
                          : exam.difficulty === "Medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {exam.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span>{exam.questions} questions</span>
                      <span>•</span>
                      <span>{exam.time}</span>
                    </div>
                    <Link
                      href={`/exam/${exam.id}`}
                      className="block w-full bg-primary text-white text-center py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Start Exam
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "results" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Exam History</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { title: "Mathematics Quiz", date: "Jan 15, 2024", score: "85%", status: "Passed" },
                  { title: "Physics Test", date: "Jan 12, 2024", score: "72%", status: "Passed" },
                  { title: "Chemistry Quiz", date: "Jan 10, 2024", score: "68%", status: "Passed" },
                  { title: "Biology Assessment", date: "Jan 8, 2024", score: "91%", status: "Passed" },
                ].map((result, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{result.title}</h3>
                      <p className="text-sm text-gray-500">{result.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-primary">{result.score}</span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {result.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
