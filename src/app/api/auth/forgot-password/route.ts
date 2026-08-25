import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/reset-token";
import { isMailConfigured, sendEmail } from "@/lib/mailer";

function baseUrlFrom(request: NextRequest): string {
  const envUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: "Email service is not configured. Please contact support to reset your password." },
      { status: 503 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always answer the same way so the endpoint can't be used to probe
  // which emails have accounts.
  const genericResponse = NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a reset link has been sent.",
  });

  if (!user) {
    return genericResponse;
  }

  const token = await createPasswordResetToken(user.id);
  const resetUrl = `${baseUrlFrom(request)}/reset-password?token=${token}`;

  const sent = await sendEmail({
    to: email,
    subject: "Reset your Aclipse Hub password",
    text: `You requested a password reset for your Aclipse Hub account.\n\nOpen this link to choose a new password (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `<p>You requested a password reset for your <strong>Aclipse Hub</strong> account.</p>
<p><a href="${resetUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Choose a new password</a></p>
<p style="color:#6b7280;font-size:13px;">Or copy this link into your browser (valid for 1 hour):<br/>${resetUrl}</p>
<p style="color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>`,
  });

  if (!sent) {
    console.error(`[reset] failed to send reset email to ${email}`);
  }

  // Same response whether the email succeeded or not — do not leak delivery state.
  return genericResponse;
}
