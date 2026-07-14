const SIGNS = [
  {
    id: "catalog",
    seal: "hat",
    name: "Luffy",
    bounty: "Catalog",
    flavor: "Chart every island set",
  },
  {
    id: "showcase",
    seal: "blades",
    name: "Zoro",
    bounty: "Showcase",
    flavor: "Three legends on deck",
  },
  {
    id: "trade",
    seal: "weather",
    name: "Nami",
    bounty: "Trade",
    flavor: "Flag cards for voyage",
  },
  {
    id: "share",
    seal: "note",
    name: "Usopp",
    bounty: "Share",
    flavor: "Post your wanted shelf",
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
    <section className="home-crew-signs space-y-5">
      <header className="max-w-xl space-y-2">
        <p className="home-coord text-[11px] text-amber-200/45">
          N 24° · E 148° · East Blue chart
        </p>
        <h2
          className="text-2xl tracking-wide text-[#f0e6d0] sm:text-3xl"
          style={{ fontFamily: "var(--font-home-display), Impact, sans-serif" }}
        >
          Crew marks of the voyage
        </h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          Wanted posters for the collectors who sail with you — flavor for the shelf, not real
          bounties.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SIGNS.map((sign) => (
          <li key={sign.id} className="home-crew-sign">
            <article className="home-wanted-poster">
              <div className="home-wanted-stamp" aria-hidden>
                Dead or Alive
              </div>
              <p className="home-wanted-eyebrow">Wanted</p>
              <div className="home-wanted-rule" aria-hidden />
              <div className="home-crew-seal text-[#6b4423]/90">
                <SealIcon kind={sign.seal} />
              </div>
              <p
                className="home-wanted-name"
                style={{ fontFamily: "var(--font-home-display), Impact, sans-serif" }}
              >
                {sign.name}
              </p>
              <div className="home-wanted-rule" aria-hidden />
              <p className="home-wanted-bounty">
                <span>Bounty</span> {sign.bounty}
              </p>
              <p className="home-wanted-flavor">{sign.flavor}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
