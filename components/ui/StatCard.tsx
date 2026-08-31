import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  icon?: ReactNode;
};

export function StatCard({ label, value, hint, className, icon }: Props) {
  return (
    <div
      className={cn(
        "surface-card rounded-[18px] px-5 py-4 transition duration-200",
        "hover:-translate-y-0.5 hover:border-amber-500/20",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        {icon ? <span className="text-amber-500/70">{icon}</span> : null}
      </div>
      <p className="font-display mt-2 text-2xl font-semibold tabular-nums tracking-tight text-white">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-zinc-500">{hint}</p> : null}
    </div>
  );
}
