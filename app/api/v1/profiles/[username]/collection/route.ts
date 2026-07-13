import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { PublicCollectionRow } from "@/lib/types/database";

type Ctx = { params: Promise<{ username: string }> };

/** Public collection — never includes estimated_value_cents (owner-private). */
export async function GET(_request: Request, context: Ctx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { username } = await context.params;
  const slug = decodeURIComponent(username).toLowerCase();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_public_collection", {
    target_username: slug,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as PublicCollectionRow[];
  return NextResponse.json({
    username: slug,
    count: rows.length,
    cards: rows.map((row) => ({
      collection_id: row.collection_id,
      card_id: row.card_id,
      quantity: row.quantity,
      condition: row.condition,
      notes: row.notes,
      is_for_trade: row.is_for_trade,
      is_graded: row.is_graded,
      grading_company: row.grading_company,
      grade: row.grade,
      cert_number: row.cert_number,
      slab_image_url: row.slab_image_url,
      is_black_label: row.is_black_label,
      card_number: row.card_number,
      card_name: row.card_name,
      set_name: row.set_name,
      rarity: row.rarity,
      color: row.color,
      type: row.type,
      image_url: row.image_url,
    })),
  });
}
