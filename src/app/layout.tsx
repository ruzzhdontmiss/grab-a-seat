import type { Metadata } from "next";
import { Archivo, Barlow_Condensed, JetBrains_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Ticker, type TickerItem } from "@/components/ticker";

import "./globals.css";

/* §4 typography: condensed display, humanist body, tabular mono for numbers. */
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-archivo",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FanTicket Hub — NFL & NBA ticket price tracker",
    template: "%s · FanTicket Hub",
  },
  description:
    "Compare all-in ticket prices across marketplaces and get alerted the moment they drop. Not a ticket seller.",
};

/* Static ticker sample for Phase 0; becomes live data in Phase 2. */
const TICKER_ITEMS: TickerItem[] = [
  { id: "t1", direction: "down", text: "18%  LAL–BOS · $71 → $58 · SeatGeek" },
  { id: "t2", direction: "down", text: "12%  CHI–GB · $134 → $118 · Ticketmaster" },
  { id: "t3", direction: "up", text: "9%  NYK–MIA · $96 → $105 · SeatGeek" },
  { id: "t4", direction: "down", text: "24%  DAL–PHI · $188 → $143 · TickPick" },
  { id: "t5", direction: "flat", text: "NEW  DEN–LAL tickets listed · StubHub" },
  { id: "t6", direction: "down", text: "31%  BKN–TOR · $61 → $42 · SeatGeek" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${barlowCondensed.variable} ${jetBrainsMono.variable}`}
    >
      <body className="bg-ink text-text flex min-h-screen flex-col antialiased">
        <Ticker items={TICKER_ITEMS} />
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
