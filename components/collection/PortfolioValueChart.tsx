"use client";

import { useId, useMemo, useState } from "react";
import { formatUsdCents } from "@/lib/money";
import {
  buildValueChart,
  formatAxisCents,
  type PortfolioSnapshot,
} from "@/lib/portfolio";

type Props = { snapshots: PortfolioSnapshot[] };

export function PortfolioValueChart({ snapshots }: Props) {
  const gradId = useId().replace(/:/g, "");
  const chart = useMemo(() => buildValueChart(snapshots, 640, 280), [snapshots]);
  const [activeId, setActiveId] = useState<string | null>(null);

  if (!chart || chart.points.length === 0) {
    return (
      <p className="empty-state px-4 py-10 text-center text-sm">
        Save estimated values on your cards to start a portfolio graph. Snapshots are stored
        daily when totals change.
      </p>
    );
  }

  const active =
    chart.points.find((p) => p.id === activeId) ??
    chart.points[chart.points.length - 1];

  return (
    <div className="surface-card overflow-hidden rounded-[20px]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800/80 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Portfolio value over time
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-white">
            {formatUsdCents(active.valueCents)}
          </p>
          <p className="text-xs text-zinc-500">
            {new Date(active.recordedAt).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {activeId ? "" : " · latest"}
          </p>
        </div>
        <p className="text-xs text-zinc-500">
          {chart.points.length} snapshot{chart.points.length === 1 ? "" : "s"} · hover a point
        </p>
      </div>

      <div className="relative px-2 pb-2 pt-3 sm:px-3">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="h-auto w-full text-amber-400"
          role="img"
          aria-label="Portfolio value chart"
          onMouseLeave={() => setActiveId(null)}
        >
          <defs>
            <linearGradient id={`fill-${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f6c75b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f6c75b" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid + Y labels */}
          {chart.yTicks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={chart.plotLeft}
                x2={chart.plotRight}
                y1={tick.y}
                y2={tick.y}
                stroke="#3f3f46"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={chart.plotLeft - 8}
                y={tick.y + 3}
                textAnchor="end"
                className="fill-zinc-500"
                style={{ fontSize: 11 }}
              >
                {formatAxisCents(tick.value)}
              </text>
            </g>
          ))}

          {/* X labels */}
          {chart.xTicks.map((tick, i) => (
            <text
              key={`${tick.label}-${i}`}
              x={tick.x}
              y={chart.height - 12}
              textAnchor="middle"
              className="fill-zinc-500"
              style={{ fontSize: 11 }}
            >
              {tick.label}
            </text>
          ))}

          {/* Area + line */}
          {chart.areaPath ? (
            <path d={chart.areaPath} fill={`url(#fill-${gradId})`} />
          ) : null}
          <path
            d={chart.linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Active guide */}
          {active ? (
            <line
              x1={active.x}
              x2={active.x}
              y1={chart.plotTop}
              y2={chart.plotBottom}
              stroke="#a1a1aa"
              strokeOpacity="0.45"
              strokeWidth="1"
            />
          ) : null}

          {/* Points + hit targets */}
          {chart.points.map((p) => {
            const isActive = p.id === active.id;
            return (
              <g key={p.id}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? 5 : 3.5}
                  fill={isActive ? "#ffe08a" : "#121722"}
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={14}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveId(p.id)}
                  onFocus={() => setActiveId(p.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${formatUsdCents(p.valueCents)} on ${new Date(p.recordedAt).toLocaleDateString()}`}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
