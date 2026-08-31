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
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <TitleTag
          className={cn(
            "font-display font-semibold tracking-[-0.035em] text-white",
            TitleTag === "h1" ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl",
          )}
        >
          {title}
        </TitleTag>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-[15px]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
