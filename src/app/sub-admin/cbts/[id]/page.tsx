"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CbtForm } from "@/components/sub-admin/cbt-form";

interface Existing {
  id: string;
  title: string;
  description: string | null;
  subject: { id: string; name: string };
  schoolTier: string | null;
  examType: string;
  timer: number;
  status: string;
  reviewFeedback: string | null;
  questions: { question: { id: string } }[];
}

export default function EditCbtPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [existing, setExisting] = useState<Existing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sub-admin/cbts/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) router.replace("/sub-admin/cbts");
        throw new Error(String(res.status));
      }
      const data = await res.json();
      setExisting(data.exam);
    } catch {
      setError("Failed to load CBT.");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSave(payload: Record<string, unknown>) {
    setError(null);
    try {
      const res = await fetch(`/api/sub-admin/cbts/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Failed to save.");
        return false;
      }
      await load();
      return true;
    } catch {
      setError("Failed to save.");
      return false;
    }
  }

  async function submitForReview() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sub-admin/cbts/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING_REVIEW" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      router.push("/sub-admin/cbts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }
  if (!existing) return null;

  const editable = existing.status === "DRAFT" || existing.status === "REJECTED";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/sub-admin/cbts" className="text-sm text-primary hover:underline mb-2 inline-block">
          ← Back to My CBTs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit CBT</h1>
        <p className="text-sm text-gray-500 mt-1">
          Status: <span className="font-medium text-gray-700">{existing.status.replace(/_/g, " ")}</span>
          {existing.reviewFeedback && (
            <span className="block text-red-600 mt-1">Head Admin feedback: {existing.reviewFeedback}</span>
          )}
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}

      {!editable ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-600 font-medium mb-2">This CBT is under review or published and can no longer be edited.</p>
          <Link href="/sub-admin/cbts" className="text-primary font-medium hover:underline">Back to My CBTs</Link>
        </div>
      ) : (
        <CbtForm
          mode="edit"
          existing={{
            id: existing.id,
            title: existing.title,
            description: existing.description,
            subjectId: existing.subject.id,
            schoolTier: existing.schoolTier,
            examType: existing.examType,
            timer: existing.timer,
            status: existing.status,
            questionIds: existing.questions.map((q) => q.question.id),
          }}
          onSave={onSave}
          extraActions={
            <button
              onClick={submitForReview}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit for review"}
            </button>
          }
        />
      )}
    </div>
  );
}