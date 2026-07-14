import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JustTCG } from "justtcg-js";

function loadEnv() {
  const text = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

async function main() {
  const key = process.env.JUSTTCG_API_KEY?.trim();
  if (!key) {
    console.error("NO_KEY");
    process.exit(1);
  }
  const client = new JustTCG({ apiKey: key });
  const games = await client.v1.games.list();
  if (games.error) {
    console.log("GAMES_ERROR", games.error);
    return;
  }
  const op = games.data.filter((g) => /piece|onepiece/i.test(`${g.id} ${g.name}`));
  console.log(
    "OP_GAMES",
    op.map((g) => `${g.id} | ${g.name} | ${g.cards_count}`).join("\n"),
  );
  const game = op[0]?.id ?? "onepiece";
  await new Promise((r) => setTimeout(r, 1500));
  const r = await client.v1.cards.get({
    game,
    query: "OP01-001",
    limit: 3,
    include_price_history: false,
    include_null_prices: true,
  });
  console.log("QUERY", game, r.error || "ok", r.data?.length ?? 0);
  for (const c of r.data?.slice(0, 3) ?? []) {
    console.log("-", c.name, "| num=", c.number, "| $", c.variants?.[0]?.price, c.variants?.[0]?.condition);
  }
}

main().catch((e) => {
  console.error("FATAL", e instanceof Error ? e.message : e);
  process.exit(1);
});
