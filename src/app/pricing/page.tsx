import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";

import { JsonLd } from "@/components/domain/json-ld";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "FanTicket Hub is free. A premium plan with 5-minute alerts, SMS and full price history launches in Phase 3.",
  alternates: { canonical: absoluteUrl("/pricing") },
};

interface Feature {
  label: string;
  free: string | boolean;
  premium: string | boolean;
}

const FEATURES: Feature[] = [
  { label: "All-in price comparison", free: true, premium: true },
  { label: "Follow teams", free: true, premium: true },
  { label: "Price alerts", free: "Every 15 min", premium: "Every 5 min" },
  { label: "Email alerts", free: true, premium: true },
  { label: "Web push alerts", free: false, premium: true },
  { label: "SMS alerts", free: false, premium: true },
  { label: "Price history", free: "30 days", premium: "All time" },
  { label: "Daily digest", free: true, premium: true },
  { label: "Ads", free: "Shown", premium: "None" },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) {
    return <Check size={14} className="text-volt inline" aria-label="Included" />;
  }
  if (value === false) {
    return (
      <Minus size={14} className="text-text-dim inline" aria-label="Not included" />
    );
  }
  return <span className="text-text text-[12px]">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="space-y-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `${SITE_NAME} Premium`,
          description:
            "5-minute alert lane, web push and SMS alerts, full price history and no ads.",
          offers: {
            "@type": "Offer",
            price: "4.99",
            priceCurrency: "USD",
            availability: "https://schema.org/PreOrder",
            url: absoluteUrl("/pricing"),
          },
        }}
      />

      <header className="border-line border-b pb-8">
        <p className="label">Pricing</p>
        <h1 className="mt-3 text-5xl">Free to use. Premium when you need speed.</h1>
        <p className="text-text-dim mt-4 max-w-2xl text-[15px] leading-relaxed">
          Comparing prices is always free. Premium adds a faster alert lane, more
          channels and unlimited history. We are not a ticket seller — purchases always
          happen on the provider.
        </p>
      </header>

      <div className="border-line bg-surface overflow-x-auto border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Feature</TableHead>
              <TableHead className="text-right">Free</TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-2">
                  Premium
                  <Badge variant="outline">Phase 3</Badge>
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FEATURES.map((feature) => (
              <TableRow key={feature.label}>
                <TableCell>{feature.label}</TableCell>
                <TableCell className="text-right">
                  <Cell value={feature.free} />
                </TableCell>
                <TableCell className="text-right">
                  <Cell value={feature.premium} />
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="hover:bg-transparent">
              <TableCell className="text-text-dim">Price</TableCell>
              <TableCell className="text-right font-mono text-[15px] tabular-nums">
                $0
              </TableCell>
              <TableCell className="text-right font-mono text-[15px] tabular-nums">
                $4.99/mo
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/register" className={buttonVariants({ size: "lg" })}>
          Create a free account
        </Link>
        <span
          className={buttonVariants({
            variant: "secondary",
            size: "lg",
            className: "cursor-not-allowed opacity-50",
          })}
          aria-disabled
        >
          Premium — coming in Phase 3
        </span>
      </div>

      <p className="text-text-dim max-w-2xl text-[12px] leading-relaxed">
        Premium billing is not live yet; the roadmap schedules Stripe checkout and SMS
        for Phase 3. Until then every account is on the free plan.
      </p>
    </div>
  );
}
