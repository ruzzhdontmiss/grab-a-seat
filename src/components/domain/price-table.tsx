import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PriceRow {
  providerId: string;
  name: string;
  /** inventory = real prices; deeplink = CTA only. */
  type: "inventory" | "deeplink";
  allInCents: number | null;
  minCents: number | null;
  feesCents: number | null;
  listingCount: number | null;
  isEstimate: boolean;
  /** Internal `/api/r/{provider}?game=…` href. */
  href: string;
  isBest: boolean;
  isMock: boolean;
}

function money(cents: number | null): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function count(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US");
}

/**
 * Provider comparison table (roadmap §1.4): sorted by all-in price, Best Deal
 * row highlighted volt, estimated fees labelled, one CTA per provider.
 */
export function PriceTable({ rows }: { rows: PriceRow[] }) {
  return (
    <div className="border-line bg-surface overflow-x-auto border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Provider</TableHead>
            <TableHead numeric className="hidden sm:table-cell">
              Base
            </TableHead>
            <TableHead numeric className="hidden sm:table-cell">
              Fees
            </TableHead>
            <TableHead numeric>All-in</TableHead>
            <TableHead numeric className="hidden md:table-cell">
              Listings
            </TableHead>
            <TableHead className="text-right">Buy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.providerId}
              className={cn(row.isBest && "bg-volt/[0.06]")}
            >
              <TableCell className={cn(row.isBest && "border-volt border-l-2")}>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">{row.name}</span>
                  {row.isBest ? <Badge variant="volt">Best deal</Badge> : null}
                  {row.type === "deeplink" ? (
                    <Badge variant="outline">no price feed</Badge>
                  ) : null}
                  {row.isMock ? <Badge variant="neutral">mock</Badge> : null}
                </div>
              </TableCell>
              <TableCell numeric className="text-text-dim hidden sm:table-cell">
                {row.type === "inventory" ? money(row.minCents) : "—"}
              </TableCell>
              <TableCell numeric className="text-text-dim hidden sm:table-cell">
                {row.type === "inventory"
                  ? row.isEstimate
                    ? `${money(row.feesCents)} est.`
                    : money(row.feesCents)
                  : "—"}
              </TableCell>
              <TableCell numeric className="font-medium">
                {row.type === "inventory" ? (
                  <>
                    {money(row.allInCents)}
                    {row.isEstimate && row.allInCents !== null ? (
                      <span className="text-text-dim ml-1">est.</span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-text-dim">—</span>
                )}
              </TableCell>
              <TableCell numeric className="text-text-dim hidden md:table-cell">
                {row.type === "inventory" ? count(row.listingCount) : "—"}
              </TableCell>
              <TableCell className="text-right">
                <a
                  href={row.href}
                  rel="nofollow sponsored noopener"
                  target="_blank"
                  className={buttonVariants({
                    variant: row.isBest ? "primary" : "secondary",
                    size: "sm",
                  })}
                >
                  {row.type === "inventory" ? "View deal" : "View site"}
                  <ArrowUpRight size={13} />
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
