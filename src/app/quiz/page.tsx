"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const sampleQuestions: Question[] = [
  {
    id: 1,
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: 2,
    explanation: "Paris is the capital and largest city of France.",
  },
  {
    id: 2,
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: 1,
    explanation: "Mars is called the Red Planet due to its reddish appearance caused by iron oxide on its surface.",
  },
  {
    id: 3,
    question: "What is the chemical symbol for water?",
    options: ["H2O", "CO2", "NaCl", "O2"],
    correctAnswer: 0,
    explanation: "H2O is the chemical formula for water, consisting of 2 hydrogen atoms and 1 oxygen atom.",
  },
  {
    id: 4,
    question: "Which of the following is NOT a type of rock?",
    options: ["Igneous", "Sedimentary", "Metamorphic", "Mineral"],
    correctAnswer: 3,
    explanation: "Mineral is not a type of rock. The three main types of rocks are Igneous, Sedimentary, and Metamorphic.",
  },
  {
    id: 5,
    question: "What is the largest organ in the human body?",
    options: ["Heart", "Liver", "Brain", "Skin"],
    correctAnswer: 3,
    explanation: "The skin is the largest organ in the human body, covering about 20 square feet in adults.",
  },
];

export default function QuizPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(sampleQuestions.length).fill(null)
  );
  const [markedForReview, setMarkedForReview] = useState<boolean[]>(
    new Array(sampleQuestions.length).fill(false)
  );
  const [timeLeft, setTimeLeft] = useState(600);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState({ name: "", email: "" });
  const [showScore, setShowScore] = useState(false);
  const [score, setScore] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Auto-save to localStorage
  useEffect(() => {
    if (quizStarted) {
      localStorage.setItem(
        "quizState",
        JSON.stringify({
          currentQuestion,
          answers,
          markedForReview,
          timeLeft,
        })
      );
    }
  }, [currentQuestion, answers, markedForReview, timeLeft, quizStarted]);

  // Load saved state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("quizState");
      if (!saved) return;
      const state = JSON.parse(saved);
      if (
        Array.isArray(state.answers) &&
        state.answers.length === sampleQuestions.length &&
        Array.isArray(state.markedForReview) &&
        state.markedForReview.length === sampleQuestions.length &&
        typeof state.timeLeft === "number" &&
        state.timeLeft > 0 &&
        typeof state.currentQuestion === "number" &&
        state.currentQuestion >= 0 &&
        state.currentQuestion < sampleQuestions.length
      ) {
        // Restoring persisted state in an effect (not a lazy initializer)
        // avoids an SSR hydration mismatch; the sync setStates are intentional.
        /* eslint-disable react-hooks/set-state-in-effect */
        setCurrentQuestion(state.currentQuestion);
        setAnswers(state.answers);
        setMarkedForReview(state.markedForReview);
        setTimeLeft(state.timeLeft);
        setQuizStarted(true);
        /* eslint-enable react-hooks/set-state-in-effect */
      } else {
        localStorage.removeItem("quizState");
      }
    } catch {
      localStorage.removeItem("quizState");
    }
  }, []);

  const handleSubmit = useCallback(() => {
    setQuizCompleted(true);
    setShowResultForm(true);
    localStorage.removeItem("quizState");
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !quizCompleted && quizStarted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !quizCompleted && quizStarted) {
      // Defer out of the effect body so state updates don't cascade synchronously
      const submitTimer = setTimeout(handleSubmit, 0);
      return () => clearTimeout(submitTimer);
    }
  }, [timeLeft, quizCompleted, quizStarted, handleSubmit]);

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < sampleQuestions.length - 1) {
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

  const handleResultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let correctCount = 0;
    answers.forEach((answer, index) => {
      if (answer === sampleQuestions[index].correctAnswer) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setShowResultForm(false);
    setShowScore(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const answeredCount = answers.filter((a) => a !== null).length;
  const markedCount = markedForReview.filter((m) => m).length;

  // Start Quiz Screen
  if (!quizStarted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="max-w-lg w-full mx-4">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Weekly Quiz - General Knowledge
              </h1>
              <p className="text-gray-600 mb-6">
                Test your knowledge with {sampleQuestions.length} questions. You have 10 minutes to complete the quiz.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">Quiz Instructions:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Click an option to select your answer</li>
                  <li>• Use Previous/Next buttons to navigate</li>
                  <li>• Mark questions for review with the flag icon</li>
                  <li>• Quiz auto-submits when time runs out</li>
                  <li>• Your progress is saved automatically</li>
                </ul>
              </div>

              <button
                onClick={() => setQuizStarted(true)}
                className="w-full bg-primary text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
              >
                Start Quiz
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Score Screen
  if (showScore) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="max-w-lg w-full mx-4">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Completed!</h1>
              <p className="text-gray-600 mb-6">Here are your results, {visitorInfo.name}</p>

              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="text-5xl font-bold text-primary mb-2">
                  {score}/{sampleQuestions.length}
                </div>
                <div className="text-lg text-gray-600">
                  {Math.round((score / sampleQuestions.length) * 100)}% Correct
                </div>
              </div>

              <div className="space-y-3 text-left mb-6 max-h-64 overflow-y-auto">
                {sampleQuestions.map((q, i) => (
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
                <Link href="/" className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                  Back to Home
                </Link>
                <Link href="/login" className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Join Premium
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Result Form Screen
  if (showResultForm) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="max-w-md w-full mx-4">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">View Your Results</h2>
              <p className="text-gray-600 mb-6 text-center">Enter your details to see your score and corrections.</p>

              <form onSubmit={handleResultSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={visitorInfo.name}
                    onChange={(e) => setVisitorInfo({ ...visitorInfo, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={visitorInfo.email}
                    onChange={(e) => setVisitorInfo({ ...visitorInfo, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
                <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  View Results
                </button>
              </form>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Confirmation Dialog
  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-xl">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Submit Quiz?</h3>
          <div className="space-y-2 text-sm text-gray-600 mb-6">
            <p>• Answered: {answeredCount} / {sampleQuestions.length}</p>
            <p>• Unanswered: {sampleQuestions.length - answeredCount}</p>
            <p>• Marked for review: {markedCount}</p>
            <p>• Time remaining: {formatTime(timeLeft)}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmation(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Continue Quiz
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

  // Quiz Interface
  const question = sampleQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / sampleQuestions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Quiz Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Weekly Quiz - General Knowledge</h1>
            <p className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {sampleQuestions.length}
            </p>
          </div>
          <div className={`text-2xl font-bold ${timeLeft < 60 ? "text-red-600 animate-pulse" : "text-primary"}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

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

          {/* Question Indicators */}
          <div className="hidden md:flex gap-2">
            {sampleQuestions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`w-10 h-10 rounded-lg font-medium transition-colors ${
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

          {currentQuestion === sampleQuestions.length - 1 ? (
            <button
              onClick={() => setShowConfirmation(true)}
              className="px-6 py-3 rounded-lg bg-accent text-white hover:bg-orange-600 transition-colors font-medium"
            >
              Submit Quiz
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

        {/* Mobile Question Navigation */}
        <div className="md:hidden mt-6 bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500 mb-3">Question Navigator</p>
          <div className="grid grid-cols-5 gap-2">
            {sampleQuestions.map((_, i) => (
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
