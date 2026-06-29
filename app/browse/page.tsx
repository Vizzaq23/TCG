import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { CardTile } from "@/components/cards/CardTile";
import { BrowseToolbar } from "@/components/cards/BrowseToolbar";
import { AddToCollectionButton } from "@/components/cards/AddToCollectionButton";
import { Pagination } from "@/components/ui/Pagination";

const PAGE_SIZE = 24;

type SearchParams = {
  q?: string;
  set_name?: string;
  rarity?: string;
  color?: string;
  type?: string;
  page?: string;
};

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
    ilike: (column: string, pattern: string) => T;
    eq: (column: string, value: string) => T;
  },
>(query: T, params: SearchParams, q?: string) {
  let next = query;
  if (q) {
    next = next.ilike("name", `%${q}%`);
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
  searchParams: Promise<SearchParams>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Configure Supabase in <code className="rounded bg-zinc-900 px-1">.env.local</code>{" "}
          to load the card catalog.
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const supabase = await createClient();

  const { data: metaRows, error: metaError } = await supabase
    .from("cards")
    .select("set_name, rarity, color, type");

  if (metaError) {
    return (
      <main className="mx-auto max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {metaError.message}
        </p>
      </main>
    );
  }

  const setOptions = toOptions(uniqSorted(metaRows?.map((r) => r.set_name) ?? []));
  const rarityOptions = toOptions(uniqSorted(metaRows?.map((r) => r.rarity) ?? []));
  const colorOptions = toOptions(uniqSorted(metaRows?.map((r) => r.color) ?? []));
  const typeOptions = toOptions(uniqSorted(metaRows?.map((r) => r.type) ?? []));

  const q = params.q?.trim();

  const rawPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const { count: totalCount, error: countError } = await applyCardFilters(
    supabase.from("cards").select("*", { count: "exact", head: true }),
    params,
    q,
  );

  if (countError) {
    return (
      <main className="mx-auto max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {countError.message}
        </p>
      </main>
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
      <main className="mx-auto max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Browse cards</h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Search and filter the catalog. Sign in to add cards to your shelf.
        </p>
      </header>

      <BrowseToolbar
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
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center text-sm text-zinc-400">
          No cards match these filters. Try resetting or broadening your search.
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, total)} of {total} cards
          </p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
    </main>
  );
}
