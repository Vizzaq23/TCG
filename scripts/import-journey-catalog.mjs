/**
 * Refresh Journey's English catalog, Japanese additions and DON!! archive.
 * English printing IDs retain precedence; each source stays identified.
 * No database credentials are used.
 * Run: node --use-system-ca scripts/import-journey-catalog.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";

const catalogRoot = new URL("../lib/catalog/", import.meta.url);
const punkBase = "https://raw.githubusercontent.com/buhbbl/punk-records/main/english";
const japaneseBase = "https://raw.githubusercontent.com/buhbbl/punk-records/main/japanese";
const donSource = "https://optcgapi.com/api/allDonCards/";
const characterSource = "https://huggingface.co/datasets/yjg30737/onepiece-characters/resolve/main/data.json";
const snapshotPath = new URL("../.next/journey-research/characters.json", import.meta.url);

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return response.json();
}

async function pooled(items, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(12, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }));
  return results;
}

const decode = (text) => String(text ?? "").replaceAll("&amp;", "&").replaceAll("&#039;", "'").replaceAll("&quot;", '"').replace(/\s+/g, " ").trim();
const normalize = (text) => decode(text).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const aliases = {
  "Trafalgar Law": "Trafalgar D. Water Law", "Jinbe": "Jimbei",
  "Kouzuki Oden": "Kozuki Oden", "Kouzuki Momonosuke": "Kozuki Momonosuke",
  "Kouzuki Hiyori": "Kozuki Hiyori", "Kouzuki Toki": "Kozuki Toki",
  "Okiku": "Kikunojo", "Kanjuro": "Kurozumi Kanjuro", "Komurasaki": "Kozuki Hiyori",
  'Eustass"Captain"Kid': "Eustass Kid", "Ms. All Sunday": "Nico Robin",
  "Miss Doublefinger(Zala)": "Ms. Doublefinger/Paula", "Mr.1(Daz.Bonez)": "Daz Bonez",
  "Mr.2.Bon.Kurei(Bentham)": "Bentham", "Mr.3(Galdino)": "Mr. 3/Galdino",
  "Kyoshirou": "Denjiro", "Hitokiri Kamazo": "Killer", "Holedem": "Holdem",
  "Enel": "Eneru", "Iceburg": "Iceberg", "Kujyaku": "Kujaku", "Bell-mère": "Belle-Mère",
  "Little Sadi": "Sadie", "Sham": "Siam", "Captain McKinley": "McKinley",
  "Kalgara": "Karugara", "Koushirou": "Koshiro", "Ryuma": "Shimotsuki Ryuma",
  "Dr. Hogback": "Hogback", "Dr.Kureha": "Kureha", "Dr.Hiriluk": "Hiruruku",
  "Professor Clover": "Clover", "Miss.Valentine(Mikita)": "Mikita",
  "Shimotsuki Kouzaburou": "Shimotsuki Kozaburo", "Amatsuki Toki": "Kozuki Toki",
  "Gloriosa (Grandma Nyon)": "Gloriosa", 'Capone"Gang"Bege': "Capone Bege",
};

console.log("Fetching every listed English product from punk-records…");
const packs = await fetchJson(`${punkBase}/packs.json`);
const packEntries = Object.entries(packs);
const groups = await pooled(packEntries, async ([id]) => {
  const cards = await fetchJson(`${punkBase}/data/${id}.json`);
  if (!Array.isArray(cards)) throw new Error(`Invalid card array for product ${id}`);
  return { id, cards };
});

const setLookup = new Map(packEntries.map(([id, pack]) => {
  const parts = pack.title_parts;
  const label = decode(parts.label ? `${parts.label} · ${parts.title}` : pack.raw_title);
  return [id, { id, label, count: 0 }];
}));
const cardsById = new Map();
const rarityNames = { SuperRare: "Super Rare", SecretRare: "Secret Rare", TreasureRare: "Treasure Rare" };

for (const group of groups) {
  for (const raw of group.cards) {
    if (!raw.id || !raw.name || !raw.img_full_url) throw new Error(`Incomplete card in product ${group.id}`);
    const existing = cardsById.get(raw.id);
    if (existing) {
      if (!existing.setIds.includes(group.id)) existing.setIds.push(group.id);
      continue;
    }
    const baseId = raw.id.replace(/_[pr]\d+.*$/i, "");
    const originSet = baseId.match(/^([A-Z]+\d*)-/)?.[1] ?? "DON!!";
    cardsById.set(raw.id, {
      id: raw.id, baseId, name: decode(raw.name),
      type: raw.category === "Don" ? "DON!!" : raw.category,
      colors: raw.colors ?? [], rarity: rarityNames[raw.rarity] ?? raw.rarity,
      image: raw.img_full_url, crew: (raw.types ?? []).map(decode),
      originSet, setIds: [group.id], setLabel: setLookup.get(group.id).label,
      language: "en", sourceCardId: raw.id, imageAvailable: true,
      catalogSource: `https://en.onepiece-cardgame.com/cardlist/?series=${group.id}`,
    });
  }
}

for (const card of cardsById.values()) {
  const originalProduct = card.setIds.find((id) => normalize(packs[id].title_parts.label ?? "").startsWith(normalize(card.originSet)));
  if (originalProduct) card.setLabel = setLookup.get(originalProduct).label;
}

console.log("Fetching every Japanese product to find additional printing IDs…");
const japanesePacks = await fetchJson(`${japaneseBase}/packs.json`);
const japaneseGroups = await pooled(Object.keys(japanesePacks), async (id) => {
  const cards = await fetchJson(`${japaneseBase}/data/${id}.json`);
  if (!Array.isArray(cards)) throw new Error(`Invalid Japanese card array for product ${id}`);
  return { id, cards };
});
const englishIds = new Set(cardsById.keys());
const englishByBase = new Map([...cardsById.values()].map((card) => [card.baseId, card]));
const japaneseNames = new Map();
for (const group of japaneseGroups) for (const raw of group.cards) {
  const english = englishByBase.get(raw.id.replace(/_[pr]\d+.*$/i, ""));
  if (!english) continue;
  const names = japaneseNames.get(raw.name) ?? new Set();
  names.add(english.name);
  japaneseNames.set(raw.name, names);
}

for (const group of japaneseGroups) {
  const setId = `jp:${group.id}`;
  const pack = japanesePacks[group.id];
  const label = `JP · ${decode(pack.title_parts.label ? `${pack.title_parts.label} · ${pack.title_parts.title}` : pack.raw_title)}`;
  for (const raw of group.cards) {
    // Regional suffixes are source identifiers, not proof that artwork is
    // equivalent. Preserve EN on overlap and label every added JP record.
    if (englishIds.has(raw.id)) continue;
    if (!raw.id || !raw.name || !raw.img_full_url) throw new Error(`Incomplete Japanese card in ${group.id}`);
    if (!setLookup.has(setId)) setLookup.set(setId, { id: setId, label, count: 0 });
    const existing = cardsById.get(raw.id);
    if (existing) {
      if (!existing.setIds.includes(setId)) existing.setIds.push(setId);
      continue;
    }
    const baseId = raw.id.replace(/_[pr]\d+.*$/i, "");
    const english = englishByBase.get(baseId);
    const names = japaneseNames.get(raw.name);
    const name = english?.name ?? (names?.size === 1 ? [...names][0] : decode(raw.name));
    cardsById.set(raw.id, {
      id: raw.id, baseId, name, originalName: decode(raw.name),
      type: raw.category === "Don" ? "DON!!" : raw.category,
      colors: raw.colors ?? [], rarity: rarityNames[raw.rarity] ?? raw.rarity,
      image: raw.img_full_url, crew: english?.crew ?? (raw.types ?? []).map(decode),
      originSet: baseId.match(/^([A-Z]+\d*)-/)?.[1] ?? "JP",
      setIds: [setId], setLabel: label, language: "ja", sourceCardId: raw.id,
      catalogSource: `https://www.onepiece-cardgame.com/cardlist/?series=${group.id}`,
      imageAvailable: true,
    });
  }
}

console.log("Fetching the public DON!! artwork catalog…");
const donCards = await fetchJson(donSource);
if (!Array.isArray(donCards)) throw new Error("Invalid DON!! card array");
setLookup.set("don:optcg", { id: "don:optcg", label: "DON!! · Artwork archive", count: 0 });
for (const raw of donCards) {
  const sourceNumber = raw.card_image_id?.match(/^don_(\d+)$/)?.[1];
  if (!sourceNumber || !raw.card_name) throw new Error("DON!! record is missing a stable source identifier or name");
  const id = `DON-${sourceNumber.padStart(3, "0")}`;
  if (cardsById.has(id)) throw new Error(`Duplicate DON!! identifier ${id}`);
  const image = raw.card_image ?? "";
  if (image && new URL(image).hostname !== "optcgapi.com") throw new Error(`Unexpected DON!! image host for ${id}`);
  cardsById.set(id, {
    id, baseId: id, name: decode(raw.card_name), type: "DON!!", colors: [],
    rarity: "DON!!", image, imageAvailable: Boolean(image), crew: [],
    originSet: "DON", setIds: ["don:optcg"], setLabel: decode(raw.optcg_don_name),
    // The source does not identify image language. Its own IDs are used;
    // DON-xxx is an archive ID, never an invented official card number.
    language: "unspecified", sourceCardId: raw.card_image_id,
    catalogSource: `https://optcgapi.com/analytics/don/${sourceNumber}`,
  });
}

const cards = [...cardsById.values()].sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
for (const card of cards) for (const id of card.setIds) setLookup.get(id).count++;
const sets = [...setLookup.values()];

let people;
try {
  people = JSON.parse(await readFile(snapshotPath, "utf8"));
  if (!Array.isArray(people)) throw new Error("Invalid local character dataset");
} catch {
  console.log("Fetching factual character debut dataset…");
  people = await fetchJson(characterSource);
  await mkdir(new URL("../.next/journey-research/", import.meta.url), { recursive: true });
  await writeFile(snapshotPath, JSON.stringify(people));
}

const peopleByName = new Map();
for (const person of people) {
  const names = [person["Official English Name"], person["Romanized Name"]].filter(Boolean)
    .flatMap((name) => [name, ...name.replace(/\([^)]*\)/g, "").split(/[;,]/).map((part) => part.trim())]);
  for (const name of new Set(names.map(normalize).filter(Boolean))) {
    const matches = peopleByName.get(name) ?? [];
    if (!matches.includes(person)) matches.push(person);
    peopleByName.set(name, matches);
  }
}

// Store only the few structured facts we use, once per card name. No scraped
// story text, chapter pages, manga panels or scan images are copied.
const characters = {};
for (const name of new Set(cards.filter((card) => ["Character", "Leader"].includes(card.type)).map((card) => card.name))) {
  let matches = peopleByName.get(normalize(aliases[name] ?? name)) ?? [];
  // The dataset has a CP9 agent and a Wano citizen both called Kaku. Use
  // the CP9 article only when the card's printed affiliations support it.
  if (name === "Kaku" && cards.filter((card) => card.name === name).every((card) => card.crew.some((crew) => /^CP\d/.test(crew)))) {
    matches = matches.filter((person) => person["Romanized Name"] === "Kaku");
  }
  if (matches.length !== 1) continue;
  const person = matches[0];
  const debut = String(person.Debut ?? person["First Appearance"] ?? "");
  const chapterReferences = [...debut.matchAll(/Chapter\s+(\d+)([\s\S]*?)(?=Chapter\s+\d+|$)/gi)]
    .map((match) => ({ chapter: Number(match[1]), mentioned: /mention/i.test(match[2]) }));
  const reference = chapterReferences.find((item) => !item.mentioned) ?? chapterReferences[0];
  const referenceKind = reference?.chapter === 0 ? "special" : reference?.mentioned ? "mention" : "appearance";
  const chapter = reference?.chapter && reference.chapter > 0 ? reference.chapter : null;
  const episode = Number(debut.match(/Episode\s+(\d+)/i)?.[1]) || null;
  if (chapter === null && episode === null && referenceKind !== "special") continue;
  characters[name] = {
    chapter, episode,
    referenceKind,
    referenceLabel: referenceKind === "special" ? "Special manga chapter 0"
      : referenceKind === "mention" ? `First indexed mention · Chapter ${chapter}`
      : chapter ? `Character debut · Chapter ${chapter}` : "Anime appearance",
    // Qualifiers such as silhouettes/covers remain visible and are not
    // silently converted into a claim about a full first appearance.
    debut: debut.replace(/\[\d+\]/g, "").slice(0, 500),
    affiliation: String(person.Affiliations ?? "").split(";")[0].trim().slice(0, 120),
    origin: String(person.Origin ?? "").split(";")[0].trim().slice(0, 120),
    source: characterSource,
  };
}

const snapshot = {
  source: "https://github.com/buhbbl/punk-records",
  characterSource,
  characterSnapshotDate: "2023-07-08",
  importedAt: new Date().toISOString(),
  productEntries: sets.reduce((count, set) => count + set.count, 0),
  sourceCoverage: {
    englishCards: englishIds.size,
    japaneseCards: cards.filter((card) => card.language === "ja").length,
    donCards: donCards.length,
    missingImages: cards.filter((card) => !card.imageAvailable).length,
    englishProducts: groups.length,
    japaneseProductsScanned: japaneseGroups.length,
    japaneseSource: "https://github.com/buhbbl/punk-records/tree/main/japanese",
    donSource,
  },
  characters,
  cards,
};

await mkdir(catalogRoot, { recursive: true });
// Only write final artifacts after every product and the debut source succeed.
await writeFile(new URL("all-cards.json", catalogRoot), JSON.stringify(snapshot, null, 2) + "\n");
await writeFile(new URL("sets.json", catalogRoot), JSON.stringify(sets, null, 2) + "\n");
console.log(JSON.stringify({ cards: cards.length, baseCards: new Set(cards.filter((card) => card.type !== "DON!!").map((card) => card.baseId)).size, sets: sets.length, characterNames: Object.keys(characters).length, ...snapshot.sourceCoverage, emptyProducts: sets.filter((set) => !set.count).map((set) => set.label) }, null, 2));
