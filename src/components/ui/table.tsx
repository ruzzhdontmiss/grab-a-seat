import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

/** Dense data table: 40px rows, hairline dividers, right-aligned numerics. */
export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn("w-full border-collapse text-[13px]", className)} {...props} />
  );
}

export function TableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-line border-b", className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-line-soft hover:bg-surface/70 border-b transition-colors duration-150 last:border-0",
        className,
      )}
      {...props}
    />
  );
}

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function TableHead({ className, numeric = false, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        "text-text-dim h-9 px-3 text-left align-middle text-[11px] font-medium tracking-[0.1em] uppercase",
        numeric && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function TableCell({ className, numeric = false, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        "text-text h-10 px-3 align-middle",
        numeric && "text-right font-mono tabular-nums",
        className,
      )}
      {...props}
    />
  );
}
