import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { isJustTcgConfigured } from "@/lib/justtcg/client";
import { JustTcgClientError } from "@/lib/justtcg/types";
import { lookupOnePieceCard } from "@/lib/justtcg/match";
import {
  listStaleOrUnpricedCards,
  upsertJustTcgVariants,
} from "@/lib/prices/repository";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorize(request: Request): boolean {
  const secret = process.env.PRICE_SYNC_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const alt = request.headers.get("x-price-sync-secret")?.trim() ?? "";
  return bearer === secret || alt === secret;
}

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * POST /api/admin/prices/refresh
 * Authorization: Bearer $PRICE_SYNC_SECRET
 * Body: { limit?: number, force?: boolean, set?: string, card?: string }
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isJustTcgConfigured()) {
    return NextResponse.json({ error: "JUSTTCG_API_KEY is not set" }, { status: 503 });
  }

  const admin = serviceSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  let limit = 10;
  let force = false;
  let setName: string | undefined;
  let card: string | undefined;

  try {
    const body = (await request.json()) as {
      limit?: number;
      force?: boolean;
      set?: string;
      card?: string;
    };
    if (typeof body.limit === "number") limit = Math.max(1, Math.min(30, Math.floor(body.limit)));
    if (body.force) force = true;
    if (typeof body.set === "string") setName = body.set;
    if (typeof body.card === "string") card = body.card;
  } catch {
    // empty ok
  }

  const isUuid = card && /^[0-9a-f-]{36}$/i.test(card);
  const cards = await listStaleOrUnpricedCards(admin, {
    limit,
    force,
    setName,
    cardId: isUuid ? card : undefined,
    cardNumber: card && !isUuid ? card : undefined,
  });

  const updated: string[] = [];
  const missed: Array<{ id: string; reason: string }> = [];
  const seen = new Set<string>();

  for (const row of cards) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);

    try {
      const result = await lookupOnePieceCard({
        cardNumber: row.card_number,
        name: row.name,
        setName: row.set_name,
        justtcgCardId: row.justtcg_card_id,
        tcgplayerProductId: row.tcgplayer_product_id,
      });
      if (!result.card) {
        missed.push({ id: row.id, reason: result.failure?.reason ?? "No match" });
        // Drop stale wrong matches so the UI does not keep showing a bad price.
        if (
          row.market_price_cents != null &&
          /weak|refus|no reliable/i.test(result.failure?.reason ?? "")
        ) {
          await admin
            .from("cards")
            .update({
              market_price_cents: null,
              market_price_updated_at: null,
              justtcg_card_id: null,
            })
            .eq("id", row.id);
        }
        if (result.failure?.rateLimited) break;
        continue;
      }
      await upsertJustTcgVariants({
        admin,
        cardId: row.id,
        justTcgCard: result.card,
        justtcgSetId: row.justtcg_set_id,
        catalogCardNumber: row.card_number,
      });
      updated.push(row.id);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "error";
      missed.push({ id: row.id, reason });
      if (err instanceof JustTcgClientError && err.code === "rate_limited") break;
      if (
        err instanceof JustTcgClientError &&
        (err.code === "unauthorized" || err.code === "bad_request")
      ) {
        return NextResponse.json({ error: reason }, { status: 400 });
      }
    }

    await new Promise((r) => setTimeout(r, 1200));
  }

  return NextResponse.json({
    scanned: cards.length,
    synced: updated.length,
    missed: missed.length,
    updated,
    missedSample: missed.slice(0, 10),
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    requires: "Authorization: Bearer PRICE_SYNC_SECRET",
  });
}
