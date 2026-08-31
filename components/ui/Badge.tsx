import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "success" | "danger";

const tones: Record<Tone, string> = {
  neutral: "border-zinc-700 bg-zinc-900/80 text-zinc-300",
  accent: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  success: "border-emerald-500/35 bg-emerald-500/10 text-emerald-100",
  danger: "border-red-500/35 bg-red-500/10 text-red-200",
};

type Props = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

export function Badge({ children, tone = "neutral", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
