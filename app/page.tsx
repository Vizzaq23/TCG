import { Bebas_Neue } from "next/font/google";
import { PageContainer } from "@/components/ui/PageContainer";
import { Button } from "@/components/ui/Button";
import {
  HeroShowcasePreview,
  type HeroPreviewCard,
} from "@/components/marketing/HeroShowcasePreview";
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

async function loadPreviewCards(): Promise<HeroPreviewCard[] | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("cards")
      .select("name, image_url, set_name, card_number, rarity")
      .not("image_url", "is", null)
      .limit(3);
    if (!data?.length) return undefined;
    return data.map((card, i) => ({
      name: card.name,
      imageUrl: card.image_url,
      setName: card.set_name,
      cardNumber: card.card_number,
      rarity: card.rarity,
      graded: i === 1 ? { company: "PSA" as const, grade: 10 } : undefined,
    }));
  } catch {
    return undefined;
  }
}

export default async function HomePage() {
  const previewCards = await loadPreviewCards();

  return (
    <main className={`home-ambient flex flex-1 flex-col ${display.variable}`}>
      <PageContainer className="flex flex-col gap-12 py-10 sm:gap-14 sm:py-14 lg:py-16">
        <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/90">
              <span
                aria-hidden
                className="home-compass-ring inline-block h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
              />
              Grand Line collectors
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold tracking-tight text-sky-300/80">
                One Piece TCG Shelf
              </p>
              <h1
                className="max-w-[14ch] text-5xl leading-[0.95] tracking-wide text-white sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "var(--font-home-display), Impact, sans-serif" }}
              >
                Your treasure, on the shelf.
              </h1>
            </div>

            <p className="max-w-md text-base leading-relaxed text-zinc-300/90 sm:text-lg">
              Chart every card from Romance Dawn onward — track grades, quantities,
              conditions, and trades, then spotlight your legends in a premium public
              showcase worth sharing.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button href="/browse" size="lg">
                Browse the catalog
              </Button>
              <Button href="/login?next=/collection" variant="secondary" size="lg">
                Open your shelf
              </Button>
            </div>
          </div>

          <HeroShowcasePreview cards={previewCards} themed />
        </section>

        <div className="home-horizon" aria-hidden />

        <section className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          {benefits.map((item, i) => (
            <div key={item.title} className="relative space-y-2 pl-4">
              <span
                aria-hidden
                className="absolute left-0 top-1 h-full w-0.5 rounded-full bg-gradient-to-b from-amber-400/70 to-sky-500/20"
              />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-400/70">
                {String(i + 1).padStart(2, "0")} · Set sail
              </p>
              <h2 className="text-base font-semibold text-white">{item.title}</h2>
              <p className="text-sm leading-relaxed text-zinc-400">{item.body}</p>
            </div>
          ))}
        </section>
      </PageContainer>
    </main>
  );
}
