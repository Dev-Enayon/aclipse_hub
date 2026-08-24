"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccountStatusActions({
  studentId,
  accountStatus,
  status,
}: {
  studentId: string;
  accountStatus: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function update(payload: Record<string, string>) {
    setBusy(true);
    await fetch(`/api/admin/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => update({ accountStatus: accountStatus === "ACTIVE" ? "DEACTIVATED" : "ACTIVE" })}
        disabled={busy}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          accountStatus === "ACTIVE"
            ? "bg-red-50 text-red-700 hover:bg-red-100"
            : "bg-green-50 text-green-700 hover:bg-green-100"
        }`}
      >
        {accountStatus === "ACTIVE" ? "Deactivate Account" : "Activate Account"}
      </button>
      {status === "PENDING" && (
        <button
          onClick={() => update({ status: "APPROVED" })}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
        >
          Approve Enrollment
        </button>
      )}
      {status === "APPROVED" && (
        <button
          onClick={() => update({ status: "SUSPENDED" })}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
        >
          Suspend
        </button>
      )}
    </div>
  );
}
