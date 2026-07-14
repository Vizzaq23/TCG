import { formatUsdCents } from "@/lib/money";

export type PortfolioHolding = {
  id: string;
  cardName: string;
  setName: string | null;
  cardNumber: string | null;
  imageUrl: string | null;
  quantity: number;
  unitCents: number;
  lineCents: number;
  isForTrade: boolean;
  isGraded: boolean;
  priceSource: "manual" | "market" | null;
};

export type PortfolioSnapshot = {
  id: string;
  total_value_cents: number;
  recorded_at: string;
};

export function lineValueCents(quantity: number, unitCents: number | null): number {
  if (unitCents == null) return 0;
  return quantity * unitCents;
}

export function buildHoldings(
  rows: Array<{
    id: string;
    quantity: number;
    estimated_value_cents: number | null;
    is_for_trade: boolean;
    is_graded: boolean;
    cards: {
      name: string;
      set_name: string | null;
      card_number: string | null;
      image_url: string | null;
      market_price_cents?: number | null;
    } | null;
  }>,
): { valued: PortfolioHolding[]; unpriced: PortfolioHolding[] } {
  const valued: PortfolioHolding[] = [];
  const unpriced: PortfolioHolding[] = [];

  for (const row of rows) {
    const card = row.cards;
    if (!card) continue;
    const unit =
      row.estimated_value_cents != null
        ? row.estimated_value_cents
        : (card.market_price_cents ?? null);
    const holding: PortfolioHolding = {
      id: row.id,
      cardName: card.name,
      setName: card.set_name,
      cardNumber: card.card_number,
      imageUrl: card.image_url,
      quantity: row.quantity,
      unitCents: unit ?? 0,
      lineCents: lineValueCents(row.quantity, unit),
      isForTrade: row.is_for_trade,
      isGraded: row.is_graded,
      priceSource:
        row.estimated_value_cents != null
          ? "manual"
          : card.market_price_cents != null
            ? "market"
            : null,
    };
    if (unit != null) valued.push(holding);
    else unpriced.push(holding);
  }

  valued.sort((a, b) => b.lineCents - a.lineCents || a.cardName.localeCompare(b.cardName));
  unpriced.sort((a, b) => a.cardName.localeCompare(b.cardName));
  return { valued, unpriced };
}

export function portfolioDeltaLabel(
  currentCents: number,
  agoCents: number | null | undefined,
): { deltaCents: number | null; label: string; positive: boolean | null } {
  if (agoCents == null || !Number.isFinite(agoCents)) {
    return { deltaCents: null, label: "No 30-day baseline yet", positive: null };
  }
  const delta = currentCents - Number(agoCents);
  const sign = delta > 0 ? "+" : "";
  return {
    deltaCents: delta,
    label: `${sign}${formatUsdCents(delta)} vs 30 days ago`,
    positive: delta === 0 ? null : delta > 0,
  };
}

/** Normalize snapshot totals for a simple SVG sparkline (oldest → newest). */
export function sparklinePoints(
  snapshots: PortfolioSnapshot[],
  width = 320,
  height = 64,
  pad = 4,
): { points: string; min: number; max: number } {
  if (snapshots.length === 0) {
    return { points: "", min: 0, max: 0 };
  }
  const ordered = [...snapshots].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );
  const values = ordered.map((s) => s.total_value_cents);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const coords = ordered.map((s, i) => {
    const x =
      ordered.length === 1
        ? width / 2
        : pad + (i / (ordered.length - 1)) * innerW;
    const y = pad + innerH - ((s.total_value_cents - min) / span) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return { points: coords.join(" "), min, max };
}

export type ValueChartPoint = {
  id: string;
  x: number;
  y: number;
  valueCents: number;
  recordedAt: string;
};

export type ValueChartModel = {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  min: number;
  max: number;
  points: ValueChartPoint[];
  linePath: string;
  areaPath: string;
  yTicks: { value: number; y: number }[];
  xTicks: { label: string; x: number }[];
};

function niceStep(span: number, targetTicks = 4): number {
  if (span <= 0) return 100;
  const rough = span / targetTicks;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / pow;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * pow;
}

/** Full chart geometry for portfolio value over time (oldest → newest). */
export function buildValueChart(
  snapshots: PortfolioSnapshot[],
  width = 640,
  height = 280,
): ValueChartModel | null {
  if (snapshots.length === 0) return null;

  const ordered = [...snapshots].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );

  const padLeft = 56;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 36;
  const plotLeft = padLeft;
  const plotRight = width - padRight;
  const plotTop = padTop;
  const plotBottom = height - padBottom;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  const values = ordered.map((s) => s.total_value_cents);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min = Math.max(0, min - Math.max(min * 0.1, 100));
    max = max + Math.max(max * 0.1, 100);
  }
  // Pad range slightly so the line isn't flush with edges
  const pad = (max - min) * 0.08;
  min = Math.max(0, min - pad);
  max = max + pad;
  const span = Math.max(max - min, 1);

  const points: ValueChartPoint[] = ordered.map((s, i) => {
    const x =
      ordered.length === 1
        ? plotLeft + plotW / 2
        : plotLeft + (i / (ordered.length - 1)) * plotW;
    const y = plotBottom - ((s.total_value_cents - min) / span) * plotH;
    return {
      id: s.id,
      x,
      y,
      valueCents: s.total_value_cents,
      recordedAt: s.recorded_at,
    };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath =
    points.length === 0
      ? ""
      : [
          `M ${points[0].x.toFixed(2)} ${plotBottom}`,
          ...points.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
          `L ${points[points.length - 1].x.toFixed(2)} ${plotBottom}`,
          "Z",
        ].join(" ");

  const step = niceStep(span);
  const yTicks: { value: number; y: number }[] = [];
  const firstTick = Math.ceil(min / step) * step;
  for (let v = firstTick; v <= max + step * 0.01; v += step) {
    yTicks.push({
      value: Math.round(v),
      y: plotBottom - ((v - min) / span) * plotH,
    });
  }

  const xLabelCount = Math.min(ordered.length, ordered.length <= 5 ? ordered.length : 5);
  const xTicks: { label: string; x: number }[] = [];
  if (ordered.length === 1) {
    xTicks.push({
      label: formatChartDate(ordered[0].recorded_at),
      x: points[0].x,
    });
  } else {
    for (let i = 0; i < xLabelCount; i++) {
      const idx =
        xLabelCount === 1
          ? 0
          : Math.round((i / (xLabelCount - 1)) * (ordered.length - 1));
      xTicks.push({
        label: formatChartDate(ordered[idx].recorded_at),
        x: points[idx].x,
      });
    }
  }

  return {
    width,
    height,
    padLeft,
    padRight,
    padTop,
    padBottom,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    min,
    max,
    points,
    linePath,
    areaPath,
    yTicks,
    xTicks,
  };
}

function formatChartDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Compact axis labels for cents (e.g. $1.2k). */
export function formatAxisCents(cents: number): string {
  const dollars = cents / 100;
  if (Math.abs(dollars) >= 1000) {
    return `$${(dollars / 1000).toFixed(dollars >= 10000 ? 0 : 1)}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: dollars >= 100 ? 0 : 2,
  }).format(dollars);
}
