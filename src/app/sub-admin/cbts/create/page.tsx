"use client";

import { CbtForm } from "@/components/sub-admin/cbt-form";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateCbtPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSave(payload: Record<string, unknown>) {
    setError(null);
    try {
      const res = await fetch("/api/sub-admin/cbts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Failed to create CBT.");
        return false;
      }
      router.push("/sub-admin/cbts");
      return true;
    } catch {
      setError("Failed to create CBT.");
      return false;
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/sub-admin/cbts" className="text-sm text-primary hover:underline mb-2 inline-block">
          ← Back to My CBTs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create CBT</h1>
        <p className="text-gray-500 text-sm mt-1">
          Give the CBT a subject, section (JSS/SS) and exam type, then pick from your approved questions.
        </p>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}
      <CbtForm mode="create" onSave={onSave} />
    </div>
  );
}