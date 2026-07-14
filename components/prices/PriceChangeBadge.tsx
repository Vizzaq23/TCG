import { cn } from "@/lib/cn";

type Props = {
  changePct: number | null | undefined;
  windowLabel?: string;
  className?: string;
};

export function PriceChangeBadge({ changePct, windowLabel = "7d", className }: Props) {
  if (changePct == null || !Number.isFinite(changePct)) return null;
  const positive = changePct > 0;
  const neutral = changePct === 0;
  const sign = positive ? "+" : "";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums tracking-wide",
        neutral && "border-zinc-700 bg-zinc-900/80 text-zinc-400",
        positive && "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        !positive && !neutral && "border-red-500/30 bg-red-500/10 text-red-200",
        className,
      )}
    >
      {sign}
      {changePct.toFixed(1)}% {windowLabel}
    </span>
  );
}
