import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isPublishedQuestion, filterExamToPublishedQuestions } from "@/lib/public-questions";

describe("Student visibility — PUBLISHED only", () => {
  test("a PUBLISHED question is visible", () => {
    assert.equal(isPublishedQuestion({ status: "PUBLISHED" }), true);
  });

  test("DRAFT / PENDING_REVIEW / APPROVED / REJECTED questions are hidden from students", () => {
    for (const status of ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]) {
      assert.equal(isPublishedQuestion({ status }), false, `${status} must be hidden`);
    }
  });

  test("null questions are hidden", () => {
    assert.equal(isPublishedQuestion(null), false);
  });

  test("exams returned to students contain only PUBLISHED questions", () => {
    const exam = {
      id: "exam_1",
      title: "Exam",
      questions: [
        { order: 1, question: { status: "PUBLISHED" } },
        { order: 2, question: { status: "DRAFT" } },
        { order: 3, question: { status: "PENDING_REVIEW" } },
        { order: 4, question: { status: "APPROVED" } },
        { order: 5, question: null },
      ],
    };
    const filtered = filterExamToPublishedQuestions(exam);
    assert.equal(filtered.questions.length, 1);
    assert.equal(filtered.questions[0].order, 1);
  });
});