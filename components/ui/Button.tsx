import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const variants = {
  primary:
    "bg-amber-500 text-zinc-950 hover:bg-amber-400 focus-visible:ring-amber-400/50",
  secondary:
    "border border-zinc-700 bg-transparent text-zinc-100 hover:border-amber-500/50 hover:bg-zinc-900/80 focus-visible:ring-amber-500/30",
  ghost:
    "bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white focus-visible:ring-zinc-500/40",
  destructive:
    "border border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-500/20 focus-visible:ring-red-400/40",
} as const;

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
} as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

type Common = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  loading?: boolean;
};

type ButtonAsButton = Common &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = Common & {
  href: string;
  disabled?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  loading,
  ...props
}: ButtonAsButton | ButtonAsLink) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-[14px] font-semibold transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
    "disabled:pointer-events-none disabled:opacity-45",
    variants[variant],
    sizes[size],
    className,
  );

  if ("href" in props && props.href) {
    const { href, disabled } = props;
    if (disabled || loading) {
      return (
        <span className={cn(classes, "pointer-events-none opacity-45")}>
          {children}
        </span>
      );
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  const { type = "button", disabled, ...buttonRest } = props as ButtonAsButton;
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      {...buttonRest}
    >
      {children}
    </button>
  );
}
