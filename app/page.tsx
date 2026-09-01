import type { Metadata } from "next";
import { connection } from "next/server";
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

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const benefits = [
  {
    eyebrow: "Catalog",
    title: "Every card, clearly organized",
    body: "Search the full catalog, record quantities and conditions, and keep the details that matter close at hand.",
  },
  {
    eyebrow: "Value",
    title: "See the collection behind the cards",
    body: "Track cached market prices, portfolio movement, and set progress without turning the hobby into a spreadsheet.",
  },
  {
    eyebrow: "Showcase",
    title: "Present the pieces you prize most",
    body: "Build a public shelf, spotlight raw cards or graded slabs, and make trade-ready cards easy to discover.",
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

    if (!ranked.length) return undefined;

    // Give the showcase a strong pool to sample from on each homepage request.
    return ranked.slice(0, 18).map((card) => ({
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
  // The example shelf should be freshly sampled for every homepage visit.
  await connection();
  const previewCards = await loadPreviewCards();

  return (
    <main className="home-ambient flex flex-1 flex-col">
      <HomeSunnyBackdrop />

      <PageContainer className="flex flex-col gap-16 py-10 sm:gap-20 sm:py-14 lg:gap-24 lg:py-20">
        <section className="home-hero grid items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(30rem,1.08fr)] lg:gap-16">
          <div className="home-hero-copy max-w-2xl space-y-7">
            <p className="eyebrow">The collector workspace for One Piece TCG</p>
            <div className="space-y-5">
              <h1 className="font-display text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.6rem]">
                Build a collection worth showing.
              </h1>
              <p className="max-w-xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
                Catalog your cards, understand their value, manage trades, and present your best
                pulls in one polished shelf.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button href="/browse" size="lg" className="w-full sm:w-auto">
                Explore the catalog
                <span aria-hidden>→</span>
              </Button>
              <Button
                href="/login?next=/collection"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                View your collection
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-800/70 pt-5 text-xs font-medium uppercase tracking-[0.11em] text-zinc-500">
              <span>Catalog</span>
              <span className="text-amber-500/60">•</span>
              <span>Portfolio</span>
              <span className="text-amber-500/60">•</span>
              <span>Trades</span>
              <span className="text-amber-500/60">•</span>
              <span>Showcase</span>
            </div>
          </div>

          <HeroShowcasePreview cards={previewCards} themed className="lg:translate-x-2" />
        </section>

        <CrewSignsStrip />

        <section className="space-y-8 border-t border-zinc-800/70 pt-10 sm:pt-12">
          <div className="max-w-2xl space-y-3">
            <p className="eyebrow">Designed around the hobby</p>
            <h2 className="font-display text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              The details stay useful. The cards stay center stage.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {benefits.map((item, i) => (
              <article key={item.title} className="surface-card group rounded-[20px] p-6 transition duration-200 hover:-translate-y-1 hover:border-amber-500/20">
                <div className="mb-10 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300/80">
                    {item.eyebrow}
                  </p>
                  <span className="font-mono text-xs text-zinc-700">0{i + 1}</span>
                </div>
                <h3 className="font-display text-xl font-semibold tracking-[-0.025em] text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
