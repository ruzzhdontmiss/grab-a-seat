import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <p className="label">Privacy</p>
      <h1 className="text-4xl">Privacy</h1>
      <p className="text-text-dim text-[15px] leading-relaxed">
        We collect the minimum needed to run alerts: your email address, the teams and
        games you follow, and the alert preferences you set. We log affiliate clicks to
        measure referrals.
      </p>
      <p className="text-text-dim text-[15px] leading-relaxed">
        We do not sell your data. You can delete your account and its data at any time.
      </p>
      <p className="text-text-dim text-[13px] leading-relaxed">
        Draft copy — the full privacy policy is finalized before launch.
      </p>
    </article>
  );
}
