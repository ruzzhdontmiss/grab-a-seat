import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "volt" | "amber" | "red" | "neutral" | "outline";

const styles: Record<Variant, string> = {
  volt: "border-volt/40 bg-volt/10 text-volt",
  amber: "border-amber/40 bg-amber/10 text-amber",
  red: "border-red/40 bg-red/10 text-red",
  neutral: "border-line bg-surface-2 text-text-dim",
  outline: "border-line bg-transparent text-text",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

/** Tiny uppercase tag. The only place a rounded shape is allowed (§4). */
export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] leading-none font-medium tracking-[0.12em] uppercase",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
