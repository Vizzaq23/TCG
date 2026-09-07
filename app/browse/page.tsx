import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { CardTile } from "@/components/cards/CardTile";
import { BrowseToolbar } from "@/components/cards/BrowseToolbar";
import { AddToCollectionButton } from "@/components/cards/AddToCollectionButton";
import { Pagination } from "@/components/ui/Pagination";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { toSetOptions } from "@/lib/catalog-options";
import { buildCatalogSearchFilter, normalizeCatalogSearchQuery, readCatalogMetadata, type CatalogMetadata } from "@/lib/catalog-query";
import {
  firstSearchParam,
  type SearchParamValue,
} from "@/lib/search-params";

const PAGE_SIZE = 24;

type SearchParams = {
  q?: string;
  set_name?: string;
  rarity?: string;
  color?: string;
  type?: string;
  page?: string;
};

type RawSearchParams = Partial<Record<keyof SearchParams, SearchParamValue>>;

function uniqSorted(values: (string | null | undefined)[]) {
  return [...new Set(values.filter(Boolean) as string[])].sort((a, b) =>
    a.localeCompare(b),
  );
}

function toOptions(values: string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

function applyCardFilters<
  T extends {
    or: (filters: string) => T;
    eq: (column: string, value: string) => T;
  },
>(query: T, params: SearchParams, q?: string) {
  let next = query;
  const searchFilter = buildCatalogSearchFilter(q);
  if (searchFilter) {
    next = next.or(searchFilter);
  }
  if (params.set_name) {
    next = next.eq("set_name", params.set_name);
  }
  if (params.rarity) {
    next = next.eq("rarity", params.rarity);
  }
  if (params.color) {
    next = next.eq("color", params.color);
  }
  if (params.type) {
    next = next.eq("type", params.type);
  }
  return next;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer as="main" className="py-12">
        <p className="surface-card rounded-[18px] border-amber-500/30 p-5 text-sm text-amber-100">
          Configure Supabase in <code className="rounded bg-zinc-900 px-1">.env.local</code>{" "}
          to load the card catalog.
        </p>
      </PageContainer>
    );
  }

  const rawParams = await searchParams;
  const params: SearchParams = {
    q: firstSearchParam(rawParams.q),
    set_name: firstSearchParam(rawParams.set_name),
    rarity: firstSearchParam(rawParams.rarity),
    color: firstSearchParam(rawParams.color),
    type: firstSearchParam(rawParams.type),
    page: firstSearchParam(rawParams.page),
  };
  const supabase = await createClient();

  let metaRows: CatalogMetadata[];
  try {
    metaRows = await readCatalogMetadata(supabase);
  } catch (error) {
    return (
      <PageContainer as="main" className="py-12">
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error instanceof Error ? error.message : "The catalog filters could not be loaded."}
        </p>
      </PageContainer>
    );
  }

  const setOptions = toSetOptions(metaRows?.map((r) => r.set_name) ?? []);
  const rarityOptions = toOptions(uniqSorted(metaRows?.map((r) => r.rarity) ?? []));
  const colorOptions = toOptions(uniqSorted(metaRows?.map((r) => r.color) ?? []));
  const typeOptions = toOptions(uniqSorted(metaRows?.map((r) => r.type) ?? []));

  const q = normalizeCatalogSearchQuery(params.q);

  const rawPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const { count: totalCount, error: countError } = await applyCardFilters(
    supabase.from("cards").select("*", { count: "exact", head: true }),
    params,
    q,
  );

  if (countError) {
    return (
      <PageContainer as="main" className="py-12">
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {countError.message}
        </p>
      </PageContainer>
    );
  }

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(rawPage, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: cards, error } = await applyCardFilters(
    supabase.from("cards").select("*"),
    params,
    q,
  )
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    return (
      <PageContainer as="main" className="py-12">
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error.message}
        </p>
      </PageContainer>
    );
  }

  return (
    <main className="page-ambient flex flex-1 flex-col">
      <PageContainer className="flex flex-col gap-8 py-10 sm:py-14">
        <div className="space-y-3">
          <p className="eyebrow">One Piece card catalog</p>
          <SectionHeader
            as="h1"
            title="Find your next card"
            description="Search by name, card number, or set. Find OP17, promos, and alternate prints, then narrow by rarity, color, or type."
          />
        </div>

        <BrowseToolbar
          key={[q, params.set_name, params.rarity, params.color, params.type]
            .map((value) => value ?? "")
            .join("\u001f")}
          q={q}
          setName={params.set_name}
          rarity={params.rarity}
          color={params.color}
          type={params.type}
          setOptions={setOptions}
          rarityOptions={rarityOptions}
          colorOptions={colorOptions}
          typeOptions={typeOptions}
        />

        {!cards?.length ? (
        <p className="empty-state px-5 py-16 text-center text-sm">
          No cards match these filters. Try resetting or broadening your search.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800/70 pb-4">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, total)} of {total} cards
          </p>
          <span className="hidden text-xs text-zinc-600 sm:inline">Sorted A–Z</span>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {cards.map((card) => (
              <li key={card.id}>
                <CardTile
                  card={card}
                  footer={<AddToCollectionButton cardId={card.id} />}
                />
              </li>
            ))}
          </ul>
          <Pagination
            basePath="/browse"
            currentPage={currentPage}
            totalPages={totalPages}
            searchParams={{
              q: params.q,
              set_name: params.set_name,
              rarity: params.rarity,
              color: params.color,
              type: params.type,
            }}
          />
        </>
      )}
      </PageContainer>
    </main>
  );
}
