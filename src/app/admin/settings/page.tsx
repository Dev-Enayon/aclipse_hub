"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Platform Settings</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 shrink-0">
            <nav className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="space-y-1">
                {["general", "appearance", "notifications", "security"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      activeTab === tab
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1">
            {activeTab === "general" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue="Aclipse Hub"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Platform Description</label>
                    <textarea
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={3}
                      defaultValue="Modern educational platform with free quizzes and premium CBT exams"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Quiz Duration (minutes)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Passing Score (%)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue="50"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Appearance Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Primary Color</label>
                    <div className="flex gap-3">
                      {["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626"].map((color) => (
                        <button
                          key={color}
                          className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-colors"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-2xl">A</span>
                      </div>
                      <button className="text-primary hover:text-blue-700 font-medium">
                        Change Logo
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h2>
                <div className="space-y-4">
                  {[
                    { label: "Email notifications for new students", defaultChecked: true },
                    { label: "Email notifications for quiz completions", defaultChecked: true },
                    { label: "Email notifications for exam submissions", defaultChecked: true },
                    { label: "Weekly analytics report", defaultChecked: false },
                  ].map((setting, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-700">{setting.label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          defaultChecked={setting.defaultChecked}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                  <div className="flex justify-end pt-4">
                    <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500 mb-3">Add an extra layer of security to your admin account.</p>
                    <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                      Enable 2FA
                    </button>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Session Timeout</h3>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                      <option>30 minutes</option>
                      <option>1 hour</option>
                      <option>4 hours</option>
                      <option>24 hours</option>
                    </select>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">API Keys</h3>
                    <p className="text-sm text-gray-500 mb-3">Manage API keys for third-party integrations.</p>
                    <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                      Generate New Key
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
