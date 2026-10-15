import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <p className="label">About</p>
      <h1 className="text-4xl">Ticket prices, compared</h1>
      <p className="text-[15px] leading-relaxed text-text-dim">
        FanTicket Hub aggregates ticket availability and all-in prices across
        major marketplaces, shows the cheapest option per game, and alerts fans
        when prices drop or tickets appear for the teams they follow.
      </p>
      <p className="text-[15px] leading-relaxed text-text-dim">
        We are not a ticket seller. Every purchase happens on a partner site via
        an affiliate link. We may earn a commission on purchases made through
        our links, at no extra cost to you.
      </p>
      <p className="text-[15px] leading-relaxed text-text-dim">
        Not affiliated with the NFL, NBA, or any team.
      </p>
    </article>
  );
}
