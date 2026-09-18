// Question lifecycle / ownership rules shared by APIs, UIs, and tests.
//
// Lifecycle:
//   DRAFT -> PENDING_REVIEW -> APPROVED -> PUBLISHED
//                              `-> REJECTED -> (edit) -> DRAFT
//                               -> PENDING_REVIEW (resubmit)
//
// Sub-Admins may only edit/delete questions in DRAFT or REJECTED state.
// Only the Head Admin (SUPER_ADMIN) can approve, reject, or publish.

export type QuestionStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "ARCHIVED";

export const QUESTION_STATUSES: QuestionStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "PUBLISHED",
  "ARCHIVED",
];

/** Statuses a Sub-Admin is allowed to edit/delete. */
export const SUB_ADMIN_EDITABLE_STATUSES = new Set<string>(["DRAFT", "REJECTED"]);

/** Statuses that may be submitted for review. */
export const SUBMITABLE_STATUSES = new Set<string>(["DRAFT", "REJECTED"]);

/** Whether a Sub-Admin may edit/delete a question in the given state. */
export function canSubAdminEdit(status: string): boolean {
  return SUB_ADMIN_EDITABLE_STATUSES.has(status);
}

/** Whether a question may be submitted (or resubmitted) for review. */
export function canSubmitForReview(status: string): boolean {
  return SUBMITABLE_STATUSES.has(status);
}

/** Only the Head Admin can approve, reject, or publish. */
export function canManageReviews(role: string): boolean {
  return role === "SUPER_ADMIN";
}

/** No one can approve their own question — the reviewer must differ from the author. */
export function canApprove(reviewerId: string | null | undefined, authorId: string | null | undefined): boolean {
  if (!reviewerId || !authorId || reviewerId === authorId) return false;
  return true;
}

export interface ReviewAction {
  action: "approve" | "reject";
  reviewerId: string;
  authorId?: string | null;
  feedback?: string | null;
}

/**
 * Computes the next state for a review action, validating the transition.
 * Throws an Error with a human-readable message when the transition is invalid.
 */
export function applyReview(questionStatus: string, review: ReviewAction): { status: QuestionStatus; reviewFeedback: string | null } {
  if (questionStatus !== "PENDING_REVIEW") {
    throw new Error("Only questions pending review can be reviewed.");
  }
  if (review.action === "approve") {
    return { status: "APPROVED", reviewFeedback: null };
  }
  if (review.action === "reject") {
    const feedback = review.feedback?.trim();
    if (!feedback) {
      throw new Error("Rejection requires feedback for the Sub-Admin.");
    }
    return { status: "REJECTED", reviewFeedback: feedback };
  }
  throw new Error("Unknown review action.");
}

/**
 * Computes the next state for a publish action.
 * Only APPROVED questions may be published explicitly by the Head Admin.
 */
export function applyPublish(questionStatus: string): { status: "PUBLISHED" } {
  if (questionStatus !== "APPROVED") {
    throw new Error("Only approved questions can be published.");
  }
  return { status: "PUBLISHED" };
}

/**
 * Validates a submitted objective question. Returns an array of error strings
 * or an empty array when valid. Correctness rules:
 *  - text required
 *  - exactly 4 options (A–D), all non-empty
 *  - correctAnswer must be a valid index into the options
 * @returns error messages, empty when valid
 */
export function validateObjectiveQuestion(input: {
  text?: string;
  options?: unknown[];
  correctAnswer?: unknown;
  subjectId?: string;
}): string[] {
  const errors: string[] = [];
  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (!text) errors.push("Question text is required.");
  if (!input.subjectId) errors.push("A subject is required.");

  const options = Array.isArray(input.options) ? input.options : [];
  if (options.length !== 4) {
    errors.push("Exactly 4 options (A–D) are required.");
  } else {
    options.forEach((opt, i) => {
      if (typeof opt !== "string" || !opt.trim()) {
        errors.push(`Option ${String.fromCharCode(65 + i)} is required.`);
      }
    });
  }

  if (typeof input.correctAnswer !== "number" || Number.isNaN(input.correctAnswer)) {
    errors.push("A correct answer must be selected.");
  } else if (options.length === 4 && (input.correctAnswer < 0 || input.correctAnswer > 3)) {
    errors.push("Correct answer must be one of A–D.");
  }

  return errors;
}