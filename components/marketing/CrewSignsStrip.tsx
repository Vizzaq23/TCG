import Link from "next/link";

const SIGNS = [
  {
    id: "catalog",
    href: "/browse",
    seal: "hat",
    name: "Browse cards",
    bounty: "Catalog",
    flavor: "Search the card library by set, rarity, color, or type.",
  },
  {
    id: "showcase",
    href: "/collection",
    seal: "blades",
    name: "Build your shelf",
    bounty: "Collection",
    flavor: "Track copies, conditions, grades, notes, and favorites.",
  },
  {
    id: "trade",
    href: "/collection/portfolio",
    seal: "weather",
    name: "Follow the value",
    bounty: "Portfolio",
    flavor: "Review market value, priced holdings, and history.",
  },
  {
    id: "share",
    href: "/social",
    seal: "note",
    name: "Find collectors",
    bounty: "Community",
    flavor: "Follow public shelves and discover trade overlap.",
  },
] as const;

function SealIcon({ kind }: { kind: (typeof SIGNS)[number]["seal"] }) {
  if (kind === "hat") {
    return (
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden>
        <ellipse cx="32" cy="40" rx="22" ry="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M18 38c2-14 10-22 14-22s12 8 14 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M22 28h20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="32" cy="22" r="2.5" fill="currentColor" opacity="0.75" />
      </svg>
    );
  }
  if (kind === "blades") {
    return (
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden>
        <path d="M18 48L40 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M46 48L24 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M32 50V22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.65" />
      </svg>
    );
  }
  if (kind === "weather") {
    return (
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden>
        <circle cx="32" cy="28" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const r = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={32 + Math.cos(r) * 13}
              y1={28 + Math.sin(r) * 13}
              x2={32 + Math.cos(r) * 18}
              y2={28 + Math.sin(r) * 18}
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden>
      <path
        d="M24 14c8 0 12 6 12 14v24c0 4-2 6-5 6s-5-2-5-6V30c0-4-2-6-5-6s-5 2-5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="26" cy="44" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="38" cy="50" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function CrewSignsStrip() {
  return (
    <section className="space-y-7">
      <header className="max-w-2xl space-y-3">
        <p className="eyebrow">One connected shelf</p>
        <h2 className="font-display text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
          Move from discovery to display.
        </h2>
        <p className="text-sm leading-6 text-zinc-400 sm:text-[15px]">
          A focused set of tools for browsing, organizing, valuing, and sharing your collection.
        </p>
      </header>

      <div className="grid gap-px overflow-hidden rounded-[20px] border border-zinc-800/80 bg-zinc-800/70 sm:grid-cols-2 lg:grid-cols-4">
        {SIGNS.map((sign, index) => (
          <Link
            key={sign.id}
            href={sign.href}
            className="group flex min-h-56 flex-col bg-zinc-950/95 p-5 transition hover:bg-zinc-900 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500/50 sm:p-6"
          >
            <div className="flex items-start justify-between">
              <div className="grid size-11 place-items-center rounded-[14px] border border-zinc-800 bg-zinc-900 text-amber-300/80 transition group-hover:border-amber-500/20 group-hover:bg-amber-500/10">
                <SealIcon kind={sign.seal} />
              </div>
              <span className="font-mono text-[10px] text-zinc-700">0{index + 1}</span>
            </div>
            <div className="mt-auto pt-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">{sign.bounty}</p>
              <h3 className="font-display mt-2 text-lg font-semibold text-white">{sign.name}</h3>
              <p className="mt-2 text-sm leading-5 text-zinc-500">{sign.flavor}</p>
              <span className="mt-4 inline-flex text-sm text-amber-300 transition group-hover:translate-x-1" aria-hidden>→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
