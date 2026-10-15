import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

/** Dense data table: 40px rows, hairline dividers, right-aligned numerics. */
export function Table({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("w-full border-collapse text-[13px]", className)}
      {...props}
    />
  );
}

export function TableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b border-line", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-line-soft transition-colors duration-150 last:border-0 hover:bg-surface/70",
        className,
      )}
      {...props}
    />
  );
}

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function TableHead({
  className,
  numeric = false,
  ...props
}: TableHeadProps) {
  return (
    <th
      className={cn(
        "h-9 px-3 text-left align-middle text-[11px] font-medium uppercase tracking-[0.1em] text-text-dim",
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

export function TableCell({
  className,
  numeric = false,
  ...props
}: TableCellProps) {
  return (
    <td
      className={cn(
        "h-10 px-3 align-middle text-text",
        numeric && "text-right font-mono tabular-nums",
        className,
      )}
      {...props}
    />
  );
}
