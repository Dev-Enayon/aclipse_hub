"use client";

import { useState } from "react";

export default function ExamsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const exams = [
    { id: 1, title: "Mathematics Mock Exam", subject: "Mathematics", questions: 40, time: "60 min", passingScore: 50, status: "Published", created: "Jan 15, 2024" },
    { id: 2, title: "Physics Practice Test", subject: "Physics", questions: 30, time: "45 min", passingScore: 40, status: "Published", created: "Jan 20, 2024" },
    { id: 3, title: "Chemistry Assessment", subject: "Chemistry", questions: 25, time: "30 min", passingScore: 50, status: "Draft", created: "Feb 1, 2024" },
    { id: 4, title: "Biology Final Exam", subject: "Biology", questions: 50, time: "90 min", passingScore: 60, status: "Archived", created: "Dec 10, 2023" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Exam Builder</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                <option>All Subjects</option>
                <option>Mathematics</option>
                <option>Physics</option>
                <option>Chemistry</option>
                <option>Biology</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                <option>All Status</option>
                <option>Published</option>
                <option>Draft</option>
                <option>Archived</option>
              </select>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Exam
            </button>
          </div>
        </div>

        {/* Exams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  exam.status === "Published"
                    ? "bg-green-100 text-green-700"
                    : exam.status === "Draft"
                    ? "bg-gray-100 text-gray-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {exam.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Subject:</span>
                  <span className="font-medium text-gray-900">{exam.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span>Questions:</span>
                  <span className="font-medium text-gray-900">{exam.questions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium text-gray-900">{exam.time}</span>
                </div>
                <div className="flex justify-between">
                  <span>Passing Score:</span>
                  <span className="font-medium text-gray-900">{exam.passingScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium text-gray-900">{exam.created}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                  Edit
                </button>
                <button className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create Exam Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Create New Exam</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter exam title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={2}
                    placeholder="Enter exam description..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                      <option>Mathematics</option>
                      <option>Physics</option>
                      <option>Chemistry</option>
                      <option>Biology</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="60"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="40"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Selection</label>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 border-2 border-primary bg-blue-50 text-primary rounded-lg font-medium">
                      Manual Selection
                    </button>
                    <button className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                      Random Selection
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Note:</span> You can select specific questions from the question bank or let the system randomly pick questions based on subject and difficulty.
                  </p>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  Save as Draft
                </button>
                <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Create Exam
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
