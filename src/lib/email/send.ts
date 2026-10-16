/**
 * Email sending (roadmap §2: Resend + React Email).
 *
 * No `RESEND_API_KEY` must never crash the app. When it is absent (Mock Mode) we
 * render the email and write it to `.email-outbox/` in development so the alert
 * pipeline is inspectable end-to-end without a Resend account.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { Resend } from "resend";

import { env } from "@/lib/env";

export interface SendResult {
  delivered: boolean;
  mocked: boolean;
  id?: string;
  error?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  element: ReactElement;
}

const FALLBACK_FROM = "FanTicket Hub <onboarding@resend.dev>";

async function writeToOutbox(to: string, subject: string, html: string) {
  try {
    const dir = path.join(process.cwd(), ".email-outbox");
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = path.join(dir, `${stamp}-${to.replace(/[^a-z0-9]/gi, "_")}.html`);
    await writeFile(file, html, "utf8");
    return file;
  } catch {
    return null;
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const html = await render(input.element);

  if (!env.RESEND_API_KEY) {
    // The outbox is a dev affordance only — never write files in production.
    const file =
      env.NODE_ENV === "production"
        ? null
        : await writeToOutbox(input.to, input.subject, html);
    console.info(
      `[email:mock] "${input.subject}" -> ${input.to}` +
        (file ? ` (written to ${path.relative(process.cwd(), file)})` : ""),
    );
    return { delivered: false, mocked: true };
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: env.EMAIL_FROM ?? FALLBACK_FROM,
      to: input.to,
      subject: input.subject,
      html,
    });

    if (result.error) {
      return { delivered: false, mocked: false, error: result.error.message };
    }
    return { delivered: true, mocked: false, id: result.data?.id };
  } catch (error) {
    return {
      delivered: false,
      mocked: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
