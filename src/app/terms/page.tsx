import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <p className="label">Terms</p>
      <h1 className="text-4xl">Terms of use</h1>
      <p className="text-[15px] leading-relaxed text-text-dim">
        FanTicket Hub provides price comparison and alerting only. We do not
        sell tickets and are not a party to any purchase you make with a
        marketplace. Prices and availability are provided “as is” and may be out
        of date.
      </p>
      <p className="text-[13px] leading-relaxed text-text-dim">
        Draft copy — the full terms are finalized before launch.
      </p>
    </article>
  );
}
