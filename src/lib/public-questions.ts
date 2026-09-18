// Students may only ever receive PUBLISHED questions. Non-admin responses to
// question/exam endpoints filter to PUBLISHED — extracted here as a pure
// function so it can be unit-tested without a database.

export interface PublicFilterableQuestion {
  status?: string;
}

export interface PublicFilterableExamQuestion {
  order?: number;
  question?: PublicFilterableQuestion | null;
}

export interface PublicFilterableExamQuestions {
  questions?: PublicFilterableExamQuestion[];
}

export function isPublishedQuestion(question: PublicFilterableQuestion | null | undefined): boolean {
  return question?.status === "PUBLISHED";
}

/** Drops any questions that are not PUBLISHED from an exam structure. */
export function filterExamToPublishedQuestions<T extends PublicFilterableExamQuestions>(
  exam: T
): Omit<T, "questions"> & { questions: T["questions"] } {
  return {
    ...exam,
    questions: exam.questions?.filter((eq) => isPublishedQuestion(eq.question)) ?? [],
  } as Omit<T, "questions"> & { questions: T["questions"] };
}

/** Builds the sanitized, student-safe payload for an exam (no correct answers leak). */
export function publicExamQuestion<T extends { id: string; text: string; options: string; difficulty: string; tags: string; year: number | null }>(q: T) {
  return {
    id: q.id,
    text: q.text,
    options: q.options,
    difficulty: q.difficulty,
    tags: q.tags,
    year: q.year,
  };
}