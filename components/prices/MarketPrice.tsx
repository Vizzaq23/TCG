import { formatUsdCents } from "@/lib/money";
import { cn } from "@/lib/cn";

type Props = {
  cents: number | null | undefined;
  label?: string;
  printing?: string | null;
  condition?: string | null;
  size?: "sm" | "md";
  className?: string;
  unavailable?: boolean;
};

export function MarketPrice({
  cents,
  label = "Market",
  printing,
  condition,
  size = "md",
  className,
  unavailable,
}: Props) {
  const missing = unavailable || cents == null;
  return (
    <div className={cn("min-w-0", className)}>
      <p
        className={cn(
          "font-semibold tabular-nums tracking-tight",
          size === "sm" ? "font-display text-base" : "font-display text-2xl",
          missing ? "text-zinc-500" : "text-amber-200",
        )}
      >
        {missing ? "—" : formatUsdCents(cents)}
      </p>
      <p className="mt-1 truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {missing ? "Price unavailable" : label}
        {!missing && condition ? ` · ${condition}` : ""}
        {!missing && printing && printing.toLowerCase() !== "normal" ? ` · ${printing}` : ""}
      </p>
    </div>
  );
}
