import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  canSubAdminEdit,
  canSubmitForReview,
  canApprove,
  canManageReviews,
  applyReview,
  applyPublish,
  validateObjectiveQuestion,
} from "@/lib/question-workflow";

describe("Sub-Admin question edit rules", () => {
  test("can edit DRAFT and REJECTED questions", () => {
    assert.equal(canSubAdminEdit("DRAFT"), true);
    assert.equal(canSubAdminEdit("REJECTED"), true);
  });

  test("cannot edit PENDING_REVIEW questions", () => {
    assert.equal(canSubAdminEdit("PENDING_REVIEW"), false);
  });

  test("cannot edit APPROVED questions", () => {
    assert.equal(canSubAdminEdit("APPROVED"), false);
  });

  test("cannot edit PUBLISHED questions", () => {
    assert.equal(canSubAdminEdit("PUBLISHED"), false);
  });

  test("cannot edit ARCHIVED questions", () => {
    assert.equal(canSubAdminEdit("ARCHIVED"), false);
  });
});

describe("Question submission rules", () => {
  test("DRAFT and REJECTED can be submitted for review", () => {
    assert.equal(canSubmitForReview("DRAFT"), true);
    assert.equal(canSubmitForReview("REJECTED"), true);
  });

  test("PENDING_REVIEW / APPROVED / PUBLISHED cannot be re-submitted", () => {
    assert.equal(canSubmitForReview("PENDING_REVIEW"), false);
    assert.equal(canSubmitForReview("APPROVED"), false);
    assert.equal(canSubmitForReview("PUBLISHED"), false);
  });
});

describe("Self-approval prevention", () => {
  test("a Sub-Admin cannot approve their own question", () => {
    assert.equal(canApprove("user-a", "user-a"), false);
  });

  test("a different Head Admin can approve", () => {
    assert.equal(canApprove("head-admin", "user-a"), true);
  });

  test("missing ids cannot be approved", () => {
    assert.equal(canApprove(null, "user-a"), false);
    assert.equal(canApprove("head-admin", null), false);
  });
});

describe("Review / publish transitions", () => {
  test("approve requires PENDING_REVIEW and clears feedback", () => {
    const next = applyReview("PENDING_REVIEW", { action: "approve", reviewerId: "head", authorId: "auth" });
    assert.equal(next.status, "APPROVED");
    assert.equal(next.reviewFeedback, null);
  });

  test("reject requires PENDING_REVIEW and feedback", () => {
    const next = applyReview("PENDING_REVIEW", { action: "reject", reviewerId: "head", authorId: "auth", feedback: "Fix option B." });
    assert.equal(next.status, "REJECTED");
    assert.equal(next.reviewFeedback, "Fix option B.");
  });

  test("rejecting without feedback throws", () => {
    assert.throws(
      () => applyReview("PENDING_REVIEW", { action: "reject", reviewerId: "head", authorId: "auth" }),
      /feedback/,
    );
  });

  test("approving a non-pending question throws", () => {
    assert.throws(() => applyReview("DRAFT", { action: "approve", reviewerId: "head", authorId: "auth" }), /pending review/);
  });

  test("publish requires APPROVED", () => {
    assert.equal(applyPublish("APPROVED").status, "PUBLISHED");
    assert.throws(() => applyPublish("PENDING_REVIEW"), /approved/);
    assert.throws(() => applyPublish("DRAFT"), /approved/);
  });
});

describe("Review authorization", () => {
  test("only SUPER_ADMIN (Head Admin) can manage reviews and publish", () => {
    assert.equal(canManageReviews("SUPER_ADMIN"), true);
    assert.equal(canManageReviews("ADMIN"), false);
    assert.equal(canManageReviews("SUB_ADMIN"), false);
    assert.equal(canManageReviews("STUDENT"), false);
  });
});

describe("Objective question validation", () => {
  const valid = {
    text: "What is 2 + 2?",
    subjectId: "sub_1",
    options: ["1", "2", "3", "4"],
    correctAnswer: 3,
  };

  test("a valid question passes", () => {
    assert.deepEqual(validateObjectiveQuestion(valid), []);
  });

  test("missing text is rejected", () => {
    assert.ok(validateObjectiveQuestion({ ...valid, text: "  " }).length > 0);
  });

  test("missing subject is rejected", () => {
    assert.ok(validateObjectiveQuestion({ ...valid, subjectId: "" }).length > 0);
  });

  test("fewer than 4 options is rejected", () => {
    const errors = validateObjectiveQuestion({ ...valid, options: ["1", "2", "3"], correctAnswer: 2 });
    assert.ok(errors.some((e) => e.includes("4 options")));
  });

  test("blank option is rejected", () => {
    const errors = validateObjectiveQuestion({ ...valid, options: ["1", "", "3", "4"] });
    assert.ok(errors.some((e) => e.includes("Option B")));
  });

  test("out-of-range correct answer is rejected", () => {
    const errors = validateObjectiveQuestion({ ...valid, correctAnswer: 4 });
    assert.ok(errors.some((e) => e.includes("A–D")));
  });
});