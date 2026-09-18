import { prisma } from "@/lib/prisma";
import { sendEmail, isMailConfigured } from "@/lib/mailer";

/**
 * Transactional emails for the Sub-Admin question workflow.
 * All emails are plain, content-focused messages — no inline styles, no
 * passwords or tokens. When Resend is not configured the notifications are
 * skipped silently (the workflow still succeeds).
 */

interface QuestionContext {
  text: string;
  subjectName: string;
}

function baseHtml(title: string, lines: string[]): string {
  return [
    `<h1>${title}</h1>`,
    ...lines.map((line) => `<p>${line}</p>`),
    `<p>— Aclipse Hub team</p>`,
  ].join("\n");
}

function baseText(title: string, lines: string[]): string {
  return [title, "", ...lines.map((line) => line.replace(/<[^>]+>/g, "")), "", "— Aclipse Hub team"].join("\n");
}

async function activeHeadAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", admin: { status: "ACTIVE" } },
    select: { email: true },
  });
  return admins.map((a) => a.email);
}

/** Admin just submitted a question for review → notify Head Admins. */
export async function notifyQuestionSubmitted(context: QuestionContext): Promise<boolean> {
  if (!isMailConfigured()) return false;
  const to = await activeHeadAdminEmails();
  if (to.length === 0) return false;

  const title = "New question submitted for review";
  const lines = [
    `A Sub-Admin submitted a new question for your review.`,
    `Subject: <strong>${context.subjectName}</strong>`,
    `Question: "${context.text.slice(0, 200)}"`,
    `<p>Review it in the Admin dashboard: /admin/questions/review</p>`,
  ];
  return sendEmail({
    to: to[0],
    subject: title,
    html: baseHtml(title, lines),
    text: baseText(title, lines),
  });
}

/** Head Admin approved/rejected/published a question → notify the author. */
export async function notifyQuestionReviewed(params: {
  subAdminEmail: string;
  subAdminName: string;
  context: QuestionContext;
  outcome: "approved" | "rejected" | "published";
  feedback?: string | null;
}): Promise<boolean> {
  if (!isMailConfigured()) return false;

  const labels = {
    approved: "Your question was approved",
    rejected: "Your question was returned for corrections",
    published: "Your question is now published",
  } as const;
  const title = labels[params.outcome];

  const lines = [
    `Hi ${params.subAdminName},`,
    `Your question "${params.context.text.slice(0, 200)}" (${params.context.subjectName}) was ${params.outcome}.`,
  ];
  if (params.outcome === "rejected" && params.feedback) {
    lines.push(`Feedback from the reviewer: "${params.feedback}"`);
    lines.push(`You can edit the question again in your Sub-Admin dashboard: /sub-admin/questions`);
  }
  if (params.outcome === "approved") {
    lines.push(`The Head Admin can now publish it for students to see.`);
  }
  if (params.outcome === "published") {
    lines.push(`It is now available to students taking exams.`);
  }

  return sendEmail({
    to: params.subAdminEmail,
    subject: title,
    html: baseHtml(title, lines),
    text: baseText(title, lines),
  });
}