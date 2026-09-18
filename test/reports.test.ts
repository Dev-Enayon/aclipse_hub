import "dotenv/config";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { warmDatabase } from "./helpers/db";
import { createSubAdmin } from "@/lib/sub-admins";
import { getHeadAdminReport, withSubAdminStatusBreakdown } from "@/lib/reports";

/**
 * Integration tests for the Head Admin report: it must include Sub-Admin
 * question breakdowns and student data as intended.
 * Uses disposable accounts/rows cleaned up afterwards.
 */

const suffix = "@reports.aclipse.test";
const runId = `report-${Date.now().toString(36)}`;

let subAdminUserId = "";
let studentUserId = "";
let subjectId = "";

before(async () => {
  await warmDatabase();

  const sub = await createSubAdmin({
    name: `Report Fixture ${runId}`,
    email: `${runId}-sub${suffix}`,
    password: "test-password-123",
    department: "Sciences",
  });
  assert.equal(sub.ok, true);
  if (!sub.ok) return;
  subAdminUserId = sub.user.id;

  const student = await prisma.user.create({
    data: {
      email: `${runId}-student${suffix}`,
      name: "Report Student",
      role: "STUDENT",
      provider: "google",
      student: { create: {} },
    },
    select: { id: true },
  });
  studentUserId = student.id;

  const subject = await prisma.subject.create({
    data: { name: `${runId} Mathematics` },
    select: { id: true },
  });
  subjectId = subject.id;

  // One question in each lifecycle state.
  const statuses = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "PUBLISHED"] as const;
  for (const status of statuses) {
    await prisma.question.create({
      data: {
        text: `${runId} ${status} question`,
        subjectId,
        options: JSON.stringify(["A", "B", "C", "D"]),
        correctAnswer: 0,
        status,
        createdBy: subAdminUserId,
      },
    });
  }
});

after(async () => {
  // Subject deletion cascades the fixture questions.
  if (subjectId) await prisma.subject.delete({ where: { id: subjectId } }).catch(() => undefined);
  if (subAdminUserId) await prisma.user.delete({ where: { id: subAdminUserId } }).catch(() => undefined);
  if (studentUserId) await prisma.user.delete({ where: { id: studentUserId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe("Head Admin reports", () => {
  test("report includes the Sub-Admin with expected per-status breakdown and approval rate", async () => {
    const report = await withSubAdminStatusBreakdown(await getHeadAdminReport());

    const row = report.perSubAdmin.find((r) => r.userId === subAdminUserId);
    assert.ok(row, "report must include the fixture Sub-Admin");
    if (!row) return;

    assert.equal(row.name, `Report Fixture ${runId}`);
    assert.equal(row.status, "ACTIVE");
    assert.equal(row.total, 5);
    assert.equal(row.draft, 1);
    assert.equal(row.pendingReview, 1);
    assert.equal(row.approved, 1);
    assert.equal(row.rejected, 1);
    assert.equal(row.published, 1);
    // submitted = pending + approved + rejected + published = 4 → 25% approved
    assert.equal(row.approvalRate, 25);
  });

  test("report includes student totals as intended", async () => {
    const report = await getHeadAdminReport();
    const directCount = await prisma.student.count();
    assert.equal(report.totals.students, directCount);
    assert.ok(report.totals.students >= 2, "fixture student must be counted");
  });

  test("report lists questions and subject distribution", async () => {
    const report = await getHeadAdminReport();
    assert.ok(report.totals.questions >= 5);
    const subjectRow = report.perSubject.find((s) => s.subjectId === subjectId);
    assert.ok(subjectRow, "report must include the fixture subject");
    if (subjectRow) {
      assert.equal(subjectRow.total, 5);
      assert.equal(subjectRow.published, 1);
    }
    assert.ok(report.questionsByStatus.DRAFT >= 1);
    assert.ok(report.questionsByStatus.PUBLISHED >= 1);
  });

  test("active Sub-Admin counts are exposed in the report", async () => {
    const report = await getHeadAdminReport();
    assert.equal(report.totals.subAdmins, report.totals.activeSubAdmins);
    assert.ok(report.totals.activeSubAdmins >= 1);
  });
});