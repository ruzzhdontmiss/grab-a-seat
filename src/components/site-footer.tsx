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
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-volt font-display text-[13px] leading-none font-bold text-ink">
                FT
              </span>
              <span className="font-display text-[17px] font-bold uppercase tracking-tight">
                FanTicket Hub
              </span>
            </div>
            <p className="max-w-xl text-[13px] leading-relaxed text-text-dim">
              We compare all-in ticket prices across marketplaces and alert you
              when they drop. We are not a ticket seller — every purchase
              happens on a partner site.
            </p>
            <p className="max-w-xl text-[13px] leading-relaxed text-text">
              We may earn a commission on purchases made through our links, at
              no extra cost to you.
            </p>
            <p className="max-w-xl text-[13px] leading-relaxed text-text-dim">
              Not affiliated with the NFL, NBA, or any team. Prices shown are
              all-in estimates where marked — always confirm the final total at
              checkout.
            </p>
          </div>

          <nav aria-label="Legal">
            <p className="label mb-3">More</p>
            <ul className="space-y-2">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-text-dim transition-colors duration-150 hover:text-volt"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 text-[11px] uppercase tracking-[0.1em] text-text-dim sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} FanTicket Hub</span>
          <span className="font-mono tracking-normal tabular-nums">
            Updated every 15 min · fees included
          </span>
        </div>
      </div>
    </footer>
  );
}
