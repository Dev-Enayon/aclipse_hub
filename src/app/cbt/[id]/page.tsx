"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface CbtMeta {
  id: string;
  title: string;
  description: string | null;
  schoolTier: string | null;
  examType: string;
  subject: string;
  timer: number;
  questions: number;
}

interface StartQuestion {
  id: string;
  order: number;
  text: string;
  options: string[];
  difficulty: string;
}

type Stage = "meta" | "start" | "playing" | "submitting" | "done";

export default function CbtPlayPage() {
  const params = useParams<{ id: string }>();
  const [meta, setMeta] = useState<CbtMeta | null>(null);
  const [stage, setStage] = useState<Stage>("meta");
  const [name, setName] = useState("");
  const [entryCode, setEntryCode] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<StartQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const submitLock = useRef(false);
  const answersRef = useRef<(number | null)[] | null>(null);

  useEffect(() => {
    fetch(`/api/cbt/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMeta(d.cbt))
      .catch(() => {});
  }, [params.id]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !entryCode.trim()) {
      setError("Enter your name and the entry code issued by your school.");
      return;
    }
    setError(null);
    setStage("start");
    try {
      const res = await fetch(`/api/cbt/${params.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), entryCode: entryCode.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStage("meta");
        setError(data?.error ?? "Could not start the CBT.");
        return;
      }
      setAttemptId(data.attemptId);
      setQuestions(data.questions ?? []);
      const initialAnswers = (data.questions ?? []).map(() => null);
      setAnswers(initialAnswers);
      answersRef.current = initialAnswers;
      setCurrent(0);
      setSecondsLeft((data.timer ?? meta?.timer ?? 60) * 60);
      setStage("playing");
    } catch {
      setStage("meta");
      setError("Network error. Please try again.");
    }
  }

  async function submitAnswers(dontConfirm = false) {
    if (submitLock.current) return;
    const latestAnswers = answersRef.current ?? answers;
    const unanswered = latestAnswers.filter((a) => a === null).length;
    if (!dontConfirm && unanswered > 0 && !window.confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
    submitLock.current = true;
    setStage("submitting");
    setError(null);
    try {
      const res = await fetch(`/api/cbt/${params.id}/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: latestAnswers }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        submitLock.current = false;
        setStage("playing");
        setError(data?.error ?? "Could not submit. Please try again.");
        return;
      }
      setMessage(data.message ?? "Submitted. Waiting for the Head Admin to release your result.");
      setStage("done");
    } catch {
      submitLock.current = false;
      setStage("playing");
      setError("Network error. Please try again.");
    }
  }

  // Countdown
  useEffect(() => {
    if (stage !== "playing") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          submitAnswers(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const setAnswer = (idx: number, value: number | null) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      answersRef.current = next;
      return next;
    });
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const answeredCount = answers.filter((a) => a !== null).length;

  if (!meta) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">CBT Submitted</h1>
          <p className="text-gray-600 mb-6">{message ?? "Your answers have been submitted."}</p>
          <p className="text-sm text-gray-500 mb-6">
            The Head Admin will release your result. When released, you&apos;ll get a link (notification/email) to your result page.
          </p>
          <Link href="/cbt" className="inline-block bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium">
            Back to CBTs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/cbt" className="text-sm text-gray-500 hover:text-primary">← All CBTs</Link>
          {stage === "playing" && (
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${secondsLeft < 60 ? "bg-red-100 text-red-700 animate-pulse" : "bg-blue-100 text-blue-700"}`}>
              {fmt(secondsLeft)}
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}

        {stage === "meta" || stage === "start" ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-2 mb-3">
              {meta.schoolTier && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">{meta.schoolTier}</span>
              )}
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${meta.examType === "JAMB" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"}`}>{meta.examType}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{meta.title}</h1>
            <p className="text-gray-600 mt-2">{meta.description}</p>

            <div className="grid grid-cols-3 gap-4 mt-6 text-center">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-gray-900">{meta.questions}</p>
                <p className="text-xs text-gray-500 mt-1">Questions</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-gray-900">{meta.timer} min</p>
                <p className="text-xs text-gray-500 mt-1">Time limit</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-gray-900">{meta.subject}</p>
                <p className="text-xs text-gray-500 mt-1">Subject</p>
              </div>
            </div>

            <form onSubmit={start} className="mt-8 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                You need the entry code issued by the Head Admin to take this CBT. Enter your name and the code below.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. Ada Obi" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entry code *</label>
                <input value={entryCode} onChange={(e) => setEntryCode(e.target.value.toUpperCase())} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" placeholder="AHC-XXXX-XXXX" />
              </div>
              <button
                type="submit"
                disabled={stage === "start"}
                className="w-full px-5 py-3 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {stage === "start" ? "Starting..." : "Start CBT"}
              </button>
            </form>
          </div>
        ) : stage === "playing" || stage === "submitting" ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h1 className="font-semibold text-gray-900">{meta.title}</h1>
                <p className="text-xs text-gray-500 mt-0.5">Question {current + 1} of {questions.length}</p>
              </div>
              <span className="text-xs font-medium text-gray-500">{answeredCount}/{questions.length} answered</span>
            </div>

            {questions.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">This CBT has no questions available.</p>
            ) : (
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">{questions[current].text}</h2>
                <div className="space-y-3 mb-8">
                  {questions[current].options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition-colors ${
                        answers[current] === oi ? "border-primary bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${current}`}
                        checked={answers[current] === oi}
                        onChange={() => setAnswer(current, oi)}
                        className="mt-1 h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="text-sm text-gray-800">
                        <span className="font-semibold text-gray-500 mr-2">{String.fromCharCode(65 + oi)}.</span>
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                    disabled={current === 0}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex gap-1">
                    {questions.map((q, i) => (
                      <button
                        key={q.id}
                        onClick={() => setCurrent(i)}
                        className={`w-8 h-8 rounded text-xs font-semibold transition-colors ${
                          i === current
                            ? "bg-primary text-white"
                            : answers[i] !== null
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => (current < questions.length - 1 ? setCurrent((c) => c + 1) : submitAnswers())}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    {current === questions.length - 1 ? "Submit" : "Next"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}