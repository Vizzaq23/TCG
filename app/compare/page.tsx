import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { CompareCollectorsRow } from "@/lib/types/database";
import { shelfCardPath } from "@/lib/shelf-links";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CompareForm } from "@/components/collection/CompareForm";
import { Badge } from "@/components/ui/Badge";

type Props = {
  searchParams: Promise<{ a?: string; b?: string }>;
};

export default async function ComparePage({ searchParams }: Props) {
  const { a, b } = await searchParams;
  const usernameA = (a ?? "").trim().toLowerCase().replace(/^@/, "");
  const usernameB = (b ?? "").trim().toLowerCase().replace(/^@/, "");

  if (!isSupabaseConfigured()) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Configure Supabase to compare collectors.
        </p>
      </PageContainer>
    );
  }

  let rows: CompareCollectorsRow[] = [];
  let errorMessage: string | null = null;

  if (usernameA && usernameB) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("compare_collectors", {
      username_a: usernameA,
      username_b: usernameB,
    });
    if (error) errorMessage = error.message;
    else rows = (data ?? []) as CompareCollectorsRow[];
  }

  const onlyA = rows.filter((r) => r.owned_by_a && !r.owned_by_b);
  const onlyB = rows.filter((r) => r.owned_by_b && !r.owned_by_a);
  const both = rows.filter((r) => r.owned_by_a && r.owned_by_b);

  return (
    <PageContainer as="main" className="flex flex-col gap-8 py-8 sm:py-10">
      <SectionHeader
        as="h1"
        title="Compare collectors"
        description="See set overlap, unique cards, and gaps between two public shelves."
      />
      <CompareForm defaultA={usernameA} defaultB={usernameB} />

      {errorMessage ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      {usernameA && usernameB && !errorMessage ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 text-sm text-zinc-400">
            <Badge tone="accent">Shared {both.length}</Badge>
            <Badge>
              Only @{usernameA}: {onlyA.length}
            </Badge>
            <Badge>
              Only @{usernameB}: {onlyB.length}
            </Badge>
          </div>

          <CompareSection
            title={`Only @${usernameA}`}
            rows={onlyA}
            links={[{ username: usernameA, label: `@${usernameA}` }]}
          />
          <CompareSection
            title={`Only @${usernameB}`}
            rows={onlyB}
            links={[{ username: usernameB, label: `@${usernameB}` }]}
          />
          <CompareSection
            title="Both own"
            rows={both}
            links={[
              { username: usernameA, label: `@${usernameA}` },
              { username: usernameB, label: `@${usernameB}` },
            ]}
          />
        </div>
      ) : null}
    </PageContainer>
  );
}

function CompareSection({
  title,
  rows,
  links,
}: {
  title: string;
  rows: CompareCollectorsRow[];
  links: { username: string; label: string }[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {!rows.length ? (
        <p className="text-sm text-zinc-500">None</p>
      ) : (
        <ul className="max-h-72 divide-y divide-zinc-800/80 overflow-auto rounded-[14px] border border-zinc-800">
          {rows.slice(0, 100).map((row) => (
            <li
              key={row.card_id}
              className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2 text-sm text-zinc-300"
            >
              <div className="min-w-0">
                <span className="text-white">{row.card_name}</span>
                <span className="text-zinc-500">
                  {" "}
                  · {[row.set_name, row.card_number].filter(Boolean).join(" · ")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {links.map((link) => (
                  <Link
                    key={link.username}
                    href={shelfCardPath(link.username, row.card_id)}
                    className="text-amber-400/90 underline-offset-2 hover:underline"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </li>
          ))}
          {rows.length > 100 ? (
            <li className="px-4 py-2 text-xs text-zinc-500">
              Showing 100 of {rows.length}
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
