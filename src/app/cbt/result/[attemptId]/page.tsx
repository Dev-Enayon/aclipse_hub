"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

interface ResultData {
  candidateName: string;
  examTitle: string;
  subject: string;
  schoolTier: string | null;
  examType: string;
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  subjectBreakdown: { subject: string; correct: number; total: number; percentage: number }[];
  releasedAt: string;
}

export default function CbtResultPage() {
  const params = useParams<{ attemptId: string }>();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get("t") ?? undefined;
    fetch(`/api/cbt/result/${params.attemptId}${token ? `?t=${encodeURIComponent(token)}` : ""}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (res.ok) return setResult(data.result);
        setError(data?.error ?? "Could not load your result.");
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [params.attemptId, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Result unavailable</h1>
          <p className="text-gray-600">
            {error ?? "This result has not been released yet. Contact the Head Admin if you believe this is a mistake."}
          </p>
          <Link href="/cbt" className="inline-block mt-6 text-primary font-medium hover:underline">
            Back to CBTs
          </Link>
        </div>
      </div>
    );
  }

  const barColor = result.percentage >= 70 ? "bg-green-500" : result.percentage >= 50 ? "bg-blue-500" : result.percentage >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-8 text-center border-b border-gray-100">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white mb-4">
              <span className="text-3xl font-bold">{result.percentage}%</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{result.examTitle}</h1>
            <p className="text-gray-500 mt-1">{result.subject}{result.schoolTier ? ` · ${result.schoolTier}` : ""} · {result.examType} · {result.candidateName}</p>
            <div className="mt-6">
              <div className="flex items-center justify-center text-sm text-gray-600 gap-6">
                <span><span className="font-bold text-gray-900">{result.correctAnswers}</span> correct</span>
                <span><span className="font-bold text-gray-900">{result.totalQuestions - result.correctAnswers}</span> wrong</span>
                <span><span className="font-bold text-gray-900">{result.totalQuestions}</span> total</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 mt-4">
                <div className={`${barColor} h-3 rounded-full transition-all duration-700`} style={{ width: `${result.percentage}%` }} />
              </div>
            </div>
          </div>

          {result.subjectBreakdown && result.subjectBreakdown.length > 0 && (
            <div className="p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Subject breakdown</h2>
              <div className="space-y-3">
                {result.subjectBreakdown.map((s) => (
                  <div key={s.subject}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{s.subject}</span>
                      <span className="text-gray-500">{s.correct}/{s.total} ({s.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${s.percentage >= 50 ? "bg-green-500" : "bg-amber-500"} h-2 rounded-full`} style={{ width: `${s.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-gray-500">Released {new Date(result.releasedAt).toLocaleString()}</p>
            <Link href="/cbt" className="text-sm font-medium text-primary hover:underline">
              Browse more CBTs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}