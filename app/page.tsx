import { Bebas_Neue } from "next/font/google";
import { PageContainer } from "@/components/ui/PageContainer";
import { Button } from "@/components/ui/Button";
import {
  HeroShowcasePreview,
  type HeroPreviewCard,
} from "@/components/marketing/HeroShowcasePreview";
import { HomeSunnyBackdrop } from "@/components/marketing/HomeSunnyBackdrop";
import { CrewSignsStrip } from "@/components/marketing/CrewSignsStrip";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-home-display",
});

const benefits = [
  {
    title: "Log the haul",
    body: "Quantities, conditions, grades, and trade flags — every card on your voyage.",
  },
  {
    title: "Crown your legends",
    body: "Pin three prized raw cards or graded slabs in a lit Collector’s Showcase.",
  },
  {
    title: "Share your wanted poster",
    body: "A clean /u/you link so friends and traders can browse your public shelf.",
  },
];

/** Prefer iconic / high-impact arts for the home treasure showcase. */
const HERO_CARD_NUMBERS = [
  "OP01-001",
  "OP01-025",
  "OP01-016",
  "OP01-001_p1",
  "OP01-025_p1",
  "OP01-016_p1",
  "ST01-001",
  "OP01-060",
  "OP05-119",
  "OP09-118",
];

type CatalogPreview = {
  name: string;
  image_url: string | null;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
};

function scoreHeroCard(card: CatalogPreview): number {
  const num = (card.card_number ?? "").toUpperCase();
  const rarity = (card.rarity ?? "").toLowerCase();
  let score = 0;

  const preferredIndex = HERO_CARD_NUMBERS.findIndex((n) => n.toUpperCase() === num);
  if (preferredIndex >= 0) score += 1000 - preferredIndex * 10;

  if (rarity.includes("secret") || rarity === "sec" || rarity === "sp") score += 80;
  else if (rarity.includes("leader") || rarity === "l") score += 70;
  else if (rarity.includes("super") || rarity === "sr") score += 50;
  else if (rarity.includes("rare") || rarity === "r") score += 20;

  if (/_p\d+$/i.test(num)) score += 25;
  if (/luffy|zoro|nami|shanks|ace|law|sanji|robin/i.test(card.name)) score += 15;

  return score;
}

async function loadPreviewCards(): Promise<HeroPreviewCard[] | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  try {
    const supabase = await createClient();

    const { data: preferred } = await supabase
      .from("cards")
      .select("name, image_url, set_name, card_number, rarity")
      .in("card_number", HERO_CARD_NUMBERS)
      .not("image_url", "is", null);

    const { data: premium } = await supabase
      .from("cards")
      .select("name, image_url, set_name, card_number, rarity")
      .not("image_url", "is", null)
      .or(
        "rarity.ilike.%Leader%,rarity.ilike.%Secret%,rarity.ilike.%SEC%,rarity.ilike.%SP%,rarity.ilike.%Super Rare%,rarity.eq.SR,rarity.eq.SEC",
      )
      .limit(24);

    const byKey = new Map<string, CatalogPreview>();
    for (const card of [...(preferred ?? []), ...(premium ?? [])]) {
      const key = card.card_number ?? card.name;
      if (!byKey.has(key)) byKey.set(key, card);
    }

    const ranked = [...byKey.values()]
      .filter((c) => c.image_url)
      .sort((a, b) => scoreHeroCard(b) - scoreHeroCard(a));

    const picks: CatalogPreview[] = [];
    const used = new Set<string>();

    const take = (predicate: (c: CatalogPreview) => boolean) => {
      const hit = ranked.find((c) => !used.has(c.card_number ?? c.name) && predicate(c));
      if (!hit) return;
      used.add(hit.card_number ?? hit.name);
      picks.push(hit);
    };

    // Balanced trio: leader, chase/parallel, crew mate — all full card art
    take((c) => /leader/i.test(c.rarity ?? "") || /luffy/i.test(c.name));
    take((c) => /_p\d+$/i.test(c.card_number ?? "") || /secret|sec|\bsp\b|super/i.test(c.rarity ?? ""));
    take((c) => /zoro|nami|sanji|robin|law|shanks|ace/i.test(c.name));

    for (const card of ranked) {
      if (picks.length >= 3) break;
      const key = card.card_number ?? card.name;
      if (used.has(key)) continue;
      used.add(key);
      picks.push(card);
    }

    if (!picks.length) return undefined;

    return picks.slice(0, 3).map((card) => ({
      name: card.name,
      imageUrl: card.image_url,
      setName: card.set_name,
      cardNumber: card.card_number,
      rarity: card.rarity,
    }));
  } catch {
    return undefined;
  }
}

export default async function HomePage() {
  const previewCards = await loadPreviewCards();

  return (
    <main className={`home-ambient flex flex-1 flex-col ${display.variable}`}>
      <HomeSunnyBackdrop />

      <PageContainer className="flex flex-col gap-12 py-10 sm:gap-14 sm:py-14 lg:py-16">
        <section className="home-hero grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div className="home-hero-copy space-y-5">
            <div className="space-y-2.5">
              <h1 className="home-brand max-w-[13ch] text-5xl sm:text-6xl lg:text-[4.25rem]">
                One Piece TCG Shelf
              </h1>
              <p
                className="max-w-[20ch] text-xl leading-snug tracking-[0.02em] text-[#f0e6d0] sm:text-2xl"
                style={{ fontFamily: "var(--font-home-display), Impact, sans-serif" }}
              >
                Your treasure, on the shelf.
              </p>
            </div>

            <p className="max-w-md text-base leading-relaxed text-zinc-400 sm:text-[1.05rem]">
              Chart the Grand Line of your collection — then spotlight your legends for the crew
              to see.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button href="/browse" size="lg" className="home-btn home-btn-primary">
                Browse the catalog
              </Button>
              <Button
                href="/login?next=/collection"
                variant="secondary"
                size="lg"
                className="home-btn home-btn-secondary"
              >
                Open your shelf
              </Button>
            </div>
          </div>

          <HeroShowcasePreview cards={previewCards} themed />
        </section>

        <div className="home-rope" aria-hidden>
          <span className="home-rope-knot" />
        </div>

        <CrewSignsStrip />

        <section className="grid gap-7 sm:grid-cols-3 sm:gap-8">
          {benefits.map((item, i) => (
            <div key={item.title} className="home-benefit relative space-y-2 pl-4">
              <span aria-hidden className="home-benefit-mark" />
              <p className="text-[11px] font-medium tracking-[0.08em] text-[#c4a574]/70">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="text-base font-semibold text-[#f0e6d0]">{item.title}</h2>
              <p className="text-sm leading-relaxed text-zinc-400">{item.body}</p>
            </div>
          ))}
        </section>
      </PageContainer>
    </main>
  );
}
