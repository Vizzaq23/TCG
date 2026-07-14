/**
 * Sync JustTCG market prices into Supabase (cache-first app reads).
 *
 * Usage:
 *   npm run prices:sync
 *   npm run prices:sync -- --limit 10
 *   npm run prices:sync -- --card OP01-001
 *   npm run prices:sync -- --set Romance --force
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Database } from "../lib/types/database";
import { isJustTcgConfigured } from "../lib/justtcg/client";
import { JustTcgClientError } from "../lib/justtcg/types";
import { lookupOnePieceCard } from "../lib/justtcg/match";
import {
  listStaleOrUnpricedCards,
  upsertJustTcgVariants,
} from "../lib/prices/repository";

function loadEnvFile(filename: string) {
  try {
    const text = readFileSync(join(process.cwd(), filename), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

function parseArgs(argv: string[]) {
  let limit = 15;
  let force = false;
  let setName: string | undefined;
  let card: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") force = true;
    else if (a === "--limit") limit = Math.max(1, Number.parseInt(argv[++i] ?? "15", 10) || 15);
    else if (a === "--set") setName = argv[++i];
    else if (a === "--card") card = argv[++i];
  }

  return { limit, force, setName, card };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withBackoff<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let delay = 1000;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err instanceof JustTcgClientError) {
        if (err.code === "unauthorized" || err.code === "bad_request") throw err;
        if (err.code !== "rate_limited" && err.code !== "timeout" && err.code !== "http_error") {
          throw err;
        }
      }
      if (attempt === maxAttempts) break;
      await sleep(delay);
      delay *= 2;
    }
  }
  throw lastErr;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  if (!isJustTcgConfigured()) {
    console.error("JUSTTCG_API_KEY is not set");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const isUuid = args.card && /^[0-9a-f-]{36}$/i.test(args.card);

  const cards = await listStaleOrUnpricedCards(admin, {
    limit: args.limit,
    force: args.force,
    setName: args.setName,
    cardId: isUuid ? args.card : undefined,
    cardNumber: args.card && !isUuid ? args.card : undefined,
  });

  console.log(`Syncing ${cards.length} card(s) (force=${args.force})…`);

  let updated = 0;
  let missed = 0;
  const seen = new Set<string>();

  for (const card of cards) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);

    try {
      const result = await withBackoff(() =>
        lookupOnePieceCard({
          cardNumber: card.card_number,
          name: card.name,
          justtcgCardId: card.justtcg_card_id,
          tcgplayerProductId: card.tcgplayer_product_id,
        }),
      );

      if (!result.card) {
        missed += 1;
        console.log(`MISS ${card.card_number ?? card.id} ${card.name}: ${result.failure?.reason ?? "no match"}`);
        if (result.failure?.rateLimited) {
          console.error("Rate limited — stopping run.");
          break;
        }
      } else {
        const { upserted, nmCents } = await upsertJustTcgVariants({
          admin,
          cardId: card.id,
          justTcgCard: result.card,
          justtcgSetId: card.justtcg_set_id,
        });
        updated += 1;
        console.log(
          `OK ${card.card_number ?? card.id} → ${result.card.name} variants=${upserted} nm=${nmCents != null ? (nmCents / 100).toFixed(2) : "—"}`,
        );
      }
    } catch (err) {
      missed += 1;
      const msg = err instanceof Error ? err.message : "error";
      console.log(`ERR ${card.card_number ?? card.id}: ${msg}`);
      if (err instanceof JustTcgClientError && err.code === "rate_limited") {
        console.error("Rate limited — stopping run.");
        break;
      }
      if (err instanceof JustTcgClientError && (err.code === "unauthorized" || err.code === "bad_request")) {
        console.error("Fatal auth/request error — stopping.");
        process.exit(1);
      }
    }

    await sleep(1200);
  }

  console.log(`Done. updated=${updated} missed=${missed}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
