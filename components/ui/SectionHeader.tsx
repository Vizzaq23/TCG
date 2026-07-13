import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  as?: "h1" | "h2";
};

export function SectionHeader({
  title,
  description,
  actions,
  className,
  as: TitleTag = "h2",
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <TitleTag
          className={cn(
            "font-semibold tracking-tight text-white",
            TitleTag === "h1" ? "text-2xl sm:text-3xl" : "text-sm",
          )}
        >
          {title}
        </TitleTag>
        {description ? (
          <p className="max-w-2xl text-sm text-zinc-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
