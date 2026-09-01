import type { CreatorViewPoint } from "@/lib/creator";

export function CreatorViewChart({ points }: { points: CreatorViewPoint[] }) {
  const max = Math.max(1, ...points.map((point) => point.count));

  return (
    <figure className="surface-card rounded-[22px] p-5 sm:p-6">
      <figcaption>
        <p className="font-display text-lg font-semibold text-white">Profile signal</p>
        <p className="mt-1 text-xs text-zinc-500">
          Daily public shelf views · owner visits are excluded
        </p>
      </figcaption>
      <div
        className="mt-7 flex h-44 items-end gap-1.5 sm:gap-2"
        role="img"
        aria-label={points
          .map((point) => `${point.label}: ${point.count} view${point.count === 1 ? "" : "s"}`)
          .join(", ")}
      >
        {points.map((point, index) => (
          <div
            key={point.dateKey}
            className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-2"
            title={`${point.label} · ${point.count} view${point.count === 1 ? "" : "s"}`}
          >
            <span className="text-center text-[10px] tabular-nums text-zinc-600 opacity-0 transition group-hover:opacity-100">
              {point.count}
            </span>
            <div className="flex h-32 items-end overflow-hidden rounded-t-[5px] bg-zinc-900/70">
              <span
                className="creator-chart-bar block w-full rounded-t-[5px]"
                style={{
                  height: `${Math.max(point.count ? 8 : 2, (point.count / max) * 100)}%`,
                }}
              />
            </div>
            <span className="truncate text-center text-[9px] text-zinc-600">
              {index === 0 || index === points.length - 1 || index % 3 === 0
                ? point.label.replace(" ", " ")
                : ""}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}
