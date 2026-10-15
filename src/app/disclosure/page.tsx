import type { Metadata } from "next";

export const metadata: Metadata = { title: "Affiliate disclosure" };

export default function DisclosurePage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <p className="label">FTC disclosure</p>
      <h1 className="text-4xl">Affiliate disclosure</h1>
      <p className="text-text-dim text-[15px] leading-relaxed">
        FanTicket Hub is a comparison service, not a ticket seller. When you click
        through to a partner marketplace and complete a purchase, we may earn a
        commission. This never changes the price you pay.
      </p>
      <p className="text-text-dim text-[15px] leading-relaxed">
        Prices are all-in estimates where marked “est.” and are updated on a schedule.
        Ticket prices move constantly — always confirm the final total on the partner
        site before purchase.
      </p>
      <p className="text-text-dim text-[15px] leading-relaxed">
        Not affiliated with the NFL, NBA, or any team.
      </p>
    </article>
  );
}
