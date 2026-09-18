import "dotenv/config";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { warmDatabase } from "./helpers/db";
import {
  createSubAdmin,
  countActiveSubAdmins,
  setSubAdminStatus,
  ACTIVE_SUB_ADMIN_LIMIT,
  SUB_ADMIN_TEST_EMAIL_SUFFIX,
} from "@/lib/sub-admins";

/**
 * Integration tests for the global maximum of 6 active Sub-Admins.
 * Uses disposable accounts on the @aclipse.test domain, cleaned up afterwards.
 * Files run serially (see package.json test script) so active-count baselines
 * are stable.
 */

const runId = `t-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

async function cleanupTestAccounts() {
  await prisma.user.deleteMany({ where: { email: { endsWith: SUB_ADMIN_TEST_EMAIL_SUFFIX } } });
}

let baseline = 0;

before(async () => {
  await warmDatabase();
  await cleanupTestAccounts();
  baseline = await countActiveSubAdmins();
});

after(async () => {
  await cleanupTestAccounts();
  const final = await countActiveSubAdmins();
  assert.equal(final, baseline, "after cleanup, active Sub-Admin count must equal the baseline");
  await prisma.$disconnect();
});

function testEmail(n: number): string {
  return `${runId}-sub${n}${SUB_ADMIN_TEST_EMAIL_SUFFIX}`;
}

function makeInput(n: number, extra: Partial<Parameters<typeof createSubAdmin>[0]> = {}) {
  return {
    name: `Test Sub-Admin ${n}`,
    email: testEmail(n),
    password: "test-password-123",
    ...extra,
  };
}

describe("Global maximum of 6 active Sub-Admins", () => {
  test("active Sub-Admin limit is 6", () => {
    assert.equal(ACTIVE_SUB_ADMIN_LIMIT, 6);
  });

  test("a 7th active Sub-Admin can never be created (sequential)", async () => {
    const room = ACTIVE_SUB_ADMIN_LIMIT - baseline;
    const created: string[] = [];
    for (let i = 0; i < room; i++) {
      const res = await createSubAdmin(makeInput(i));
      assert.equal(res.ok, true, `creation ${i + 1}/${room} should succeed`);
      if (res.ok) created.push(res.user.email);
    }
    // Count is now exactly the limit.
    assert.equal(await countActiveSubAdmins(), ACTIVE_SUB_ADMIN_LIMIT);

    // The limit + 1 attempt MUST fail server-side.
    const blocked = await createSubAdmin(makeInput(999));
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.match(blocked.error, /6 active Sub-Admins/);
    assert.equal(await countActiveSubAdmins(), ACTIVE_SUB_ADMIN_LIMIT);
  });

  test("concurrent creation cannot bypass the 6-account limit (race test)", async () => {
    // With the baseline already at the limit from the previous serial test this
    // would fail trivially, so restore to baseline first.
    await cleanupTestAccounts();
    const target = 7; // more than the limit, fired simultaneously
    const attempts = Array.from({ length: target }, (_, i) => createSubAdmin(makeInput(200 + i)));
    const results = await Promise.all(attempts);

    const ok = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    assert.equal(ok, ACTIVE_SUB_ADMIN_LIMIT, "exactly the limit of creations should succeed");
    assert.equal(failed, 1, "exactly one creation should be rejected");
    assert.equal(await countActiveSubAdmins(), ACTIVE_SUB_ADMIN_LIMIT);
  });

  test("suspending a Sub-Admin frees a slot; reactivating cannot exceed the cap", async () => {
    await cleanupTestAccounts(); // baseline again
    const baselineNow = await countActiveSubAdmins();

    const first = await createSubAdmin(makeInput(300));
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const userId = first.user.id;

    const room = ACTIVE_SUB_ADMIN_LIMIT - baselineNow - 1;
    const created: string[] = [first.user.email];
    for (let i = 0; i < room; i++) {
      const res = await createSubAdmin(makeInput(400 + i));
      assert.equal(res.ok, true);
      if (res.ok) created.push(res.user.email);
    }
    assert.equal(await countActiveSubAdmins(), ACTIVE_SUB_ADMIN_LIMIT);

    // Suspend one → a slot frees up.
    const suspended = await setSubAdminStatus(userId, "SUSPENDED");
    assert.equal(suspended.ok, true);
    assert.equal(await countActiveSubAdmins(), ACTIVE_SUB_ADMIN_LIMIT - 1);

    // The freed slot allows a replacement.
    const replacement = await createSubAdmin(makeInput(500));
    assert.equal(replacement.ok, true, "suspending a Sub-Admin must free a slot");
    if (replacement.ok) created.push(replacement.user.email);
    assert.equal(await countActiveSubAdmins(), ACTIVE_SUB_ADMIN_LIMIT);

    // Reactivating the suspended one while at the cap MUST be blocked.
    const reactivated = await setSubAdminStatus(userId, "ACTIVE");
    assert.equal(reactivated.ok, false, "reactivation past the 6-active cap must be rejected");
    assert.equal(await countActiveSubAdmins(), ACTIVE_SUB_ADMIN_LIMIT);

    // Suspending the replacement frees a slot, so reactivating is allowed again.
    if (replacement.ok) {
      const suspendedReplacement = await setSubAdminStatus(replacement.user.id, "SUSPENDED");
      assert.equal(suspendedReplacement.ok, true);
      const reactivatedNow = await setSubAdminStatus(userId, "ACTIVE");
      assert.equal(reactivatedNow.ok, true);
      assert.equal(await countActiveSubAdmins(), ACTIVE_SUB_ADMIN_LIMIT);
    }

    await prisma.user.deleteMany({ where: { email: { in: created } } });
  });

  test("an existing student/admin email cannot be reused for a Sub-Admin", async () => {
    const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { email: true } });
    if (!existing) return;
    const res = await createSubAdmin(makeInput(600, { email: existing.email }));
    assert.equal(res.ok, false);
  });
});