import type { Metadata } from "next";
import { JourneyExplorer } from "@/components/journey/JourneyExplorer";
import { getJourneyArchive } from "@/lib/journey/archive";
import "./journey.css";

export const metadata: Metadata = {
  title: "Journey — Enter the story",
  description: "Explore One Piece cards across English and Japanese releases, promos, alternate art, and DON!! cards in a manga-inspired archive of debuts, scenes, and chapter links.",
  alternates: { canonical: "/journey" },
};
type Params = { q?: string | string[]; set?: string | string[]; type?: string | string[]; language?: string | string[]; order?: string | string[]; page?: string | string[]; card?: string | string[] };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
export default async function JourneyPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const params = {
    q: first(raw.q) ?? "", set: first(raw.set) ?? "", type: first(raw.type) ?? "",
    language: first(raw.language) ?? "",
    order: first(raw.order) === "story" ? "story" as const : "card" as const,
    page: first(raw.page) ?? "1",
    card: first(raw.card) ?? (first(raw.q) || first(raw.set) || first(raw.type) || first(raw.language) || first(raw.page) ? "" : "OP01-026"),
  };
  const archive = getJourneyArchive(params);
  return <JourneyExplorer key={JSON.stringify(params)} initialArchive={archive} initialFilters={{q:params.q,set:params.set,type:params.type,language:params.language,order:params.order,page:archive.page}} />;
}
