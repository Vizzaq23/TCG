import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const variants = {
  primary:
    "border-2 border-[#d92d32] bg-[#d92d32] text-white shadow-[3px_3px_0_rgba(217,45,50,0.22)] hover:-translate-y-0.5 hover:border-[#b71f25] hover:bg-[#b71f25] focus-visible:ring-amber-400/50",
  secondary:
    "border-2 border-zinc-700 bg-zinc-900 text-zinc-100 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-800 focus-visible:ring-amber-500/30",
  ghost:
    "border border-transparent bg-transparent text-zinc-300 hover:border-zinc-800 hover:bg-zinc-900/80 hover:text-white focus-visible:ring-zinc-500/40",
  destructive:
    "border border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-500/20 focus-visible:ring-red-400/40",
} as const;

const sizes = {
  sm: "min-h-10 px-3.5 py-1.5 text-sm",
  md: "min-h-10 px-4.5 py-2 text-sm",
  lg: "min-h-12 px-6 py-3 text-sm",
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
    "inline-flex items-center justify-center gap-2 rounded-[2px] font-semibold transition duration-150 ease-out motion-reduce:transform-none motion-reduce:transition-none",
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
      <Link href={href} prefetch={false} className={classes}>
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
