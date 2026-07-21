"use server";

import { Resend } from "resend";
import { env } from "@/env";

// Sends the login OTP via Resend. If RESEND_API_KEY isn't set, it falls back to
// logging the code to the server console so local/demo sign-in still works.
export async function sendVerificationEmailAction(email: string, otp: string) {
  const apiKey = env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`\n🔑 OTP for ${email}: ${otp}  (set RESEND_API_KEY to email it)\n`);
    return { delivered: "console" as const };
  }

  const from = env.EMAIL_FROM || "Socratix <onboarding@resend.dev>";
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Your Socratix verification code",
    text: `Your Socratix verification code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0a0a0a;">
        <h1 style="font-size: 18px; letter-spacing: 4px; text-transform: uppercase; margin: 0 0 24px;">Socratix</h1>
        <p style="font-size: 15px; line-height: 1.5; margin: 0 0 20px;">Enter this code to continue signing in:</p>
        <div style="font-size: 34px; font-weight: 600; letter-spacing: 8px; padding: 20px 0; text-align: center; border: 1px solid #e0e0e0;">${otp}</div>
        <p style="font-size: 13px; color: #666; line-height: 1.5; margin: 20px 0 0;">This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    console.error("❌ Resend failed to send OTP:", error);
    throw new Error(error.message || "Failed to send verification email");
  }

  return { delivered: "email" as const };
}
