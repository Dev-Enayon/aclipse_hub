import { randomBytes } from "node:crypto";

export const SCHOOL_TIERS = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"] as const;
export type SchoolTier = (typeof SCHOOL_TIERS)[number];

export const EXAM_TYPES = ["CBT", "JAMB"] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

export function isValidSchoolTier(value: unknown): value is SchoolTier {
  return typeof value === "string" && (SCHOOL_TIERS as readonly string[]).includes(value);
}

export function isValidExamType(value: unknown): value is ExamType {
  return typeof value === "string" && (EXAM_TYPES as readonly string[]).includes(value);
}

export interface ScoredQuestion {
  id: string;
  correctAnswer: number;
  subjectId: string;
  subjectName?: string;
}

export interface ScoreResult {
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  answered: number;
  subjectBreakdown: Record<string, { correct: number; total: number; subjectName: string }>;
}

/**
 * Server-side scoring for a CBT submission. `answers` is the raw JSON array of
 * selected answer indices (null entries = unanswered). Never trusts client
 * provided marks — the correct answers come from the database.
 */
export function scoreExam(questions: ScoredQuestion[], answers: (number | null)[]): ScoreResult {
  if (questions.length === 0) throw new Error("Cannot score an exam with no questions");

  let correctAnswers = 0;
  let answered = 0;
  const breakdown = new Map<string, { correct: number; total: number; subjectName: string }>();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const selected = answers[i] ?? -1;
    if (selected >= 0) answered += 1;

    const entry = breakdown.get(q.subjectId) ?? { correct: 0, total: 0, subjectName: q.subjectName ?? "" };
    entry.total += 1;
    if (selected === q.correctAnswer) {
      correctAnswers += 1;
      entry.correct += 1;
    }
    breakdown.set(q.subjectId, entry);
  }

  const percentage = Math.round((correctAnswers / questions.length) * 100);
  return {
    totalQuestions: questions.length,
    correctAnswers,
    percentage,
    answered,
    subjectBreakdown: Object.fromEntries(breakdown),
  };
}

/** Random lookup secret used in the student's result URL. Stored hashed analog-free. */
export function generateReleaseToken(): string {
  return randomBytes(24).toString("hex");
}