import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "default" | "sm" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-medium uppercase tracking-[0.08em] transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  // Primary buttons: volt bg, ink text (§4).
  primary: "border-volt bg-volt text-ink hover:border-volt-press hover:bg-volt-press",
  secondary: "border-line bg-surface-2 text-text hover:border-volt/60 hover:text-volt",
  ghost:
    "border-transparent bg-transparent text-text-dim hover:bg-surface-2 hover:text-text",
  danger: "border-red/60 bg-transparent text-red hover:bg-red hover:text-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[11px]",
  default: "h-9 px-3.5 text-[13px]",
  lg: "h-11 px-5 text-[13px]",
};

export interface ButtonVariants {
  variant?: Variant;
  size?: Size;
  className?: string;
}

export function buttonVariants({
  variant = "primary",
  size = "default",
  className,
}: ButtonVariants = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = "primary",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
