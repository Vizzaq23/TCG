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
        "rounded-[14px] border border-zinc-800/90 bg-zinc-900/50 px-4 py-3.5 transition",
        "hover:border-amber-500/25 hover:bg-zinc-900/80",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        {icon ? <span className="text-amber-500/70">{icon}</span> : null}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-white">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-zinc-500">{hint}</p> : null}
    </div>
  );
}
