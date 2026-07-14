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
