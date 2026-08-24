"use client";

export default function AnalyticsPage() {
  const stats = [
    { label: "Total Students", value: "1,234", change: "+12%", up: true },
    { label: "Daily Visitors", value: "5,678", change: "+8%", up: true },
    { label: "Completed Quizzes", value: "3,456", change: "+15%", up: true },
    { label: "Avg Score", value: "72%", change: "+3%", up: true },
  ];

  const subjectStats = [
    { subject: "Mathematics", students: 456, avgScore: 78, totalQuizzes: 12 },
    { subject: "Physics", students: 389, avgScore: 72, totalQuizzes: 10 },
    { subject: "Chemistry", students: 312, avgScore: 68, totalQuizzes: 8 },
    { subject: "Biology", students: 278, avgScore: 81, totalQuizzes: 9 },
  ];

  const recentActivity = [
    { action: "New student enrolled", user: "John Doe", time: "5 min ago" },
    { action: "Quiz completed", user: "Jane Smith", time: "15 min ago" },
    { action: "Exam submitted", user: "Mike Johnson", time: "1 hour ago" },
    { action: "Question published", user: "Admin", time: "2 hours ago" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="text-sm text-gray-500 mb-1">{stat.label}</div>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                <div className={`text-sm font-medium ${stat.up ? "text-green-600" : "text-red-600"}`}>
                  {stat.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subject Performance */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Subject Performance</h2>
            </div>
            <div className="p-6">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="pb-4">Subject</th>
                    <th className="pb-4">Students</th>
                    <th className="pb-4">Avg Score</th>
                    <th className="pb-4">Quizzes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subjectStats.map((stat, index) => (
                    <tr key={index}>
                      <td className="py-4">
                        <span className="font-medium text-gray-900">{stat.subject}</span>
                      </td>
                      <td className="py-4 text-gray-600">{stat.students}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                stat.avgScore >= 75 ? "bg-green-500" : stat.avgScore >= 60 ? "bg-yellow-500" : "bg-red-500"
                              }`}
                              style={{ width: `${stat.avgScore}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{stat.avgScore}%</span>
                        </div>
                      </td>
                      <td className="py-4 text-gray-600">{stat.totalQuizzes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">
                        {activity.user} • {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quiz Participation Over Time</h2>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-400">Chart will be rendered here (Chart.js integration)</p>
          </div>
        </div>
      </main>
    </div>
  );
}
