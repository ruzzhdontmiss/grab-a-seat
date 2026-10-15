import Link from "next/link";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/disclosure", label: "Affiliate disclosure" },
];

/**
 * Footer disclaimers (roadmap Phase 0 item 7 / README "Legal & Disclaimers").
 * Non-negotiable copy — do not soften.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-line bg-surface border-t">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="bg-volt font-display text-ink flex h-6 w-6 items-center justify-center rounded-[3px] text-[13px] leading-none font-bold">
                FT
              </span>
              <span className="font-display text-[17px] font-bold tracking-tight uppercase">
                FanTicket Hub
              </span>
            </div>
            <p className="text-text-dim max-w-xl text-[13px] leading-relaxed">
              We compare all-in ticket prices across marketplaces and alert you when
              they drop. We are not a ticket seller — every purchase happens on a
              partner site.
            </p>
            <p className="text-text max-w-xl text-[13px] leading-relaxed">
              We may earn a commission on purchases made through our links, at no extra
              cost to you.
            </p>
            <p className="text-text-dim max-w-xl text-[13px] leading-relaxed">
              Not affiliated with the NFL, NBA, or any team. Prices shown are all-in
              estimates where marked — always confirm the final total at checkout.
            </p>
          </div>

          <nav aria-label="Legal">
            <p className="label mb-3">More</p>
            <ul className="space-y-2">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-text-dim hover:text-volt text-[13px] transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-line text-text-dim mt-8 flex flex-col gap-2 border-t pt-6 text-[11px] tracking-[0.1em] uppercase sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} FanTicket Hub</span>
          <span className="font-mono tracking-normal tabular-nums">
            Updated every 15 min · fees included
          </span>
        </div>
      </div>
    </footer>
  );
}
