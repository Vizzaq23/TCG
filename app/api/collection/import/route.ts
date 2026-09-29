import { NextResponse } from "next/server";
import {
  type CollectionImportDraft,
  parseCollectionCsv,
} from "@/lib/collection/import-csv";
import { createClient } from "@/lib/supabase/server";

type CardLookup = {
  id: string;
  card_number: string;
  name: string;
};

type ImportResultRow = {
  cardNumber: string;
  cardId: string;
  cardName: string;
  quantity: number;
  action: "upserted";
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { csv?: unknown };
  try {
    body = (await request.json()) as { csv?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.csv !== "string" || !body.csv.trim()) {
    return NextResponse.json(
      { error: "Request body must include a non-empty csv string." },
      { status: 400 },
    );
  }

  const parsed = parseCollectionCsv(body.csv);
  if (parsed.errors.length > 0 && parsed.rows.length === 0) {
    return NextResponse.json(
      {
        error: "CSV could not be parsed.",
        parseErrors: parsed.errors,
      },
      { status: 400 },
    );
  }

  if (parsed.rows.length === 0) {
    return NextResponse.json(
      { error: "No importable rows found in CSV." },
      { status: 400 },
    );
  }

  if (parsed.rows.length > 500) {
    return NextResponse.json(
      { error: "CSV imports are limited to 500 rows at a time." },
      { status: 400 },
    );
  }

  const uniqueNumbers = [
    ...new Set(parsed.rows.map((row) => row.card_number)),
  ];
  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id, card_number, name")
    .in("card_number", uniqueNumbers);

  if (cardsError) {
    return NextResponse.json({ error: cardsError.message }, { status: 500 });
  }

  const cardByNumber = new Map<string, CardLookup>(
    ((cards ?? []) as CardLookup[]).map((card) => [card.card_number, card]),
  );

  const unmatched: string[] = [];
  const drafts: Array<CollectionImportDraft & { card: CardLookup }> = [];

  for (const row of parsed.rows) {
    const card = cardByNumber.get(row.card_number);
    if (!card) {
      unmatched.push(row.card_number);
      continue;
    }
    drafts.push({ ...row, card });
  }

  if (drafts.length === 0) {
    return NextResponse.json(
      {
        error: "None of the card numbers matched the catalog.",
        unmatched,
        parseErrors: parsed.errors,
        imported: 0,
      },
      { status: 400 },
    );
  }

  const upsertPayload = drafts.map((draft) => ({
    user_id: user.id,
    card_id: draft.card.id,
    quantity: draft.quantity,
    condition: draft.condition,
    notes: draft.notes,
    is_for_trade: draft.is_for_trade,
    is_graded: draft.is_graded,
    grading_company: draft.is_graded ? draft.grading_company : null,
    grade: draft.is_graded ? draft.grade : null,
    cert_number: draft.is_graded ? draft.cert_number : null,
    slab_image_url: draft.is_graded ? draft.slab_image_url : null,
    is_black_label: draft.is_graded ? draft.is_black_label : false,
    estimated_value_cents: draft.estimated_value_cents,
  }));

  const { error: upsertError } = await supabase
    .from("user_collections")
    .upsert(upsertPayload, { onConflict: "user_id,card_id" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  const imported: ImportResultRow[] = drafts.map((draft) => ({
    cardNumber: draft.card_number,
    cardId: draft.card.id,
    cardName: draft.card.name,
    quantity: draft.quantity,
    action: "upserted",
  }));

  return NextResponse.json({
    imported: imported.length,
    results: imported,
    unmatched,
    parseErrors: parsed.errors,
  });
}
