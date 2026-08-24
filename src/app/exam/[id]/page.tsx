"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const examQuestions: Question[] = [
  {
    id: 1,
    question: "What is the derivative of x² with respect to x?",
    options: ["x", "2x", "x²", "2x²"],
    correctAnswer: 1,
    explanation: "Using the power rule: d/dx(x²) = 2x",
  },
  {
    id: 2,
    question: "Which of the following is a vector quantity?",
    options: ["Speed", "Mass", "Force", "Temperature"],
    correctAnswer: 2,
    explanation: "Force has both magnitude and direction, making it a vector quantity.",
  },
  {
    id: 3,
    question: "What is the pH of a neutral solution?",
    options: ["0", "7", "14", "1"],
    correctAnswer: 1,
    explanation: "A neutral solution has a pH of 7 at 25°C.",
  },
  {
    id: 4,
    question: "Which organelle is responsible for protein synthesis?",
    options: ["Mitochondria", "Nucleus", "Ribosome", "Golgi apparatus"],
    correctAnswer: 2,
    explanation: "Ribosomes are the sites of protein synthesis in cells.",
  },
  {
    id: 5,
    question: "What is the SI unit of electric current?",
    options: ["Volt", "Watt", "Ampere", "Ohm"],
    correctAnswer: 2,
    explanation: "The Ampere (A) is the SI unit of electric current.",
  },
];

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(examQuestions.length).fill(null)
  );
  const [markedForReview, setMarkedForReview] = useState<boolean[]>(
    new Array(examQuestions.length).fill(false)
  );
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes
  const [examStarted, setExamStarted] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleSubmit = useCallback(() => {
    let correctCount = 0;
    answers.forEach((answer, index) => {
      if (answer === examQuestions[index].correctAnswer) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setExamCompleted(true);
    setShowConfirmation(false);
    setShowResults(true);
    localStorage.removeItem(`exam_${params.id}`);
  }, [answers, params.id]);

  useEffect(() => {
    if (timeLeft > 0 && !examCompleted && examStarted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !examCompleted && examStarted) {
      // Defer out of the effect body so state updates don't cascade synchronously
      const submitTimer = setTimeout(handleSubmit, 0);
      return () => clearTimeout(submitTimer);
    }
  }, [timeLeft, examCompleted, examStarted, handleSubmit]);

  // Auto-save
  useEffect(() => {
    if (examStarted) {
      localStorage.setItem(
        `exam_${params.id}`,
        JSON.stringify({
          currentQuestion,
          answers,
          markedForReview,
          timeLeft,
        })
      );
    }
  }, [currentQuestion, answers, markedForReview, timeLeft, examStarted, params.id]);

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < examQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const toggleMarkForReview = () => {
    const newMarked = [...markedForReview];
    newMarked[currentQuestion] = !newMarked[currentQuestion];
    setMarkedForReview(newMarked);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const answeredCount = answers.filter((a) => a !== null).length;
  const markedCount = markedForReview.filter((m) => m).length;

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Results Screen
  if (showResults) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Exam Completed!</h1>
            <p className="text-gray-600 mb-6">Here are your results</p>

            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="text-5xl font-bold text-primary mb-2">
                {score}/{examQuestions.length}
              </div>
              <div className="text-lg text-gray-600">
                {Math.round((score / examQuestions.length) * 100)}% Correct
              </div>
              <div className={`mt-4 inline-block px-4 py-2 rounded-full font-medium ${
                score / examQuestions.length >= 0.5
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}>
                {score / examQuestions.length >= 0.5 ? "PASSED" : "FAILED"}
              </div>
            </div>

            <div className="space-y-3 text-left mb-6 max-h-64 overflow-y-auto">
              {examQuestions.map((q, i) => (
                <div
                  key={q.id}
                  className={`p-3 rounded-lg ${
                    answers[i] === q.correctAnswer
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <p className="font-medium text-sm text-gray-900">Q{i + 1}: {q.question}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {answers[i] === q.correctAnswer
                      ? "✓ Correct"
                      : answers[i] === null
                      ? "✗ Not answered | Correct: " + q.options[q.correctAnswer]
                      : `✗ Your answer: ${q.options[answers[i]]} | Correct: ${q.options[q.correctAnswer]}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 italic">{q.explanation}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation Dialog
  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-xl">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Submit Exam?</h3>
          <div className="space-y-2 text-sm text-gray-600 mb-6">
            <p>• Answered: {answeredCount} / {examQuestions.length}</p>
            <p>• Unanswered: {examQuestions.length - answeredCount}</p>
            <p>• Marked for review: {markedCount}</p>
            <p>• Time remaining: {formatTime(timeLeft)}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmation(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Continue Exam
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Submit Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Start Exam Screen
  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mathematics Mock Exam</h1>
            <p className="text-gray-600 mb-6">
              {examQuestions.length} questions • 60 minutes • Passing score: 50%
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-2">Exam Instructions:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Click an option to select your answer</li>
                <li>• Use Previous/Next buttons to navigate</li>
                <li>• Mark questions for review with the flag icon</li>
                <li>• Your progress is saved automatically</li>
                <li>• Exam auto-submits when time runs out</li>
                <li>• Do not refresh the page during the exam</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </Link>
              <button
                onClick={() => setExamStarted(true)}
                className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Start Exam
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Exam Interface
  const question = examQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / examQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Exam Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Mathematics Mock Exam</h1>
              <p className="text-sm text-gray-500">
                Question {currentQuestion + 1} of {examQuestions.length}
              </p>
            </div>
            <div className={`text-2xl font-bold ${timeLeft < 300 ? "text-red-600 animate-pulse" : "text-primary"}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Main Content */}
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          {/* Progress Bar */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex-1">{question.question}</h2>
              <button
                onClick={toggleMarkForReview}
                className={`ml-4 p-2 rounded-lg transition-colors ${
                  markedForReview[currentQuestion]
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-gray-100 text-gray-400 hover:text-yellow-600"
                }`}
                title="Mark for review"
              >
                <svg className="w-5 h-5" fill={markedForReview[currentQuestion] ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    answers[currentQuestion] === index
                      ? "border-primary bg-blue-50 ring-2 ring-primary/20"
                      : "border-gray-200 hover:border-gray-300 bg-gray-50"
                  }`}
                >
                  <span className="font-medium text-gray-900">{String.fromCharCode(65 + index)}.</span>{" "}
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentQuestion === examQuestions.length - 1 ? (
              <button
                onClick={() => setShowConfirmation(true)}
                className="px-6 py-3 rounded-lg bg-accent text-white hover:bg-orange-600 transition-colors font-medium"
              >
                Submit Exam
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-3 rounded-lg bg-primary text-white hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </main>

        {/* Sidebar - Question Navigator */}
        <aside className="hidden lg:block w-64 bg-white border-l border-gray-100 p-4 sticky top-16 h-[calc(100vh-64px)]">
          <h3 className="font-semibold text-gray-900 mb-4">Question Navigator</h3>
          <div className="grid grid-cols-5 gap-2 mb-6">
            {examQuestions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`w-full aspect-square rounded-lg font-medium text-sm transition-colors ${
                  i === currentQuestion
                    ? "bg-primary text-white"
                    : markedForReview[i]
                    ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-400"
                    : answers[i] !== null
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span className="text-gray-600">Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 rounded border border-yellow-400"></div>
              <span className="text-gray-600">Marked ({markedCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 rounded"></div>
              <span className="text-gray-600">Unanswered ({examQuestions.length - answeredCount})</span>
            </div>
          </div>

          <button
            onClick={() => setShowConfirmation(true)}
            className="w-full mt-6 bg-primary text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Submit Exam
          </button>
        </aside>
      </div>

      {/* Mobile Question Navigator */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {examQuestions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQuestion(i)}
              className={`min-w-[40px] h-10 rounded-lg font-medium text-sm transition-colors ${
                i === currentQuestion
                  ? "bg-primary text-white"
                  : markedForReview[i]
                  ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-400"
                  : answers[i] !== null
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
