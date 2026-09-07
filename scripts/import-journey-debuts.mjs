/**
 * Refresh the factual OP-01 character-debut snapshot. Run with:
 * node --use-system-ca scripts/import-journey-debuts.mjs
 * Does not change authored stories or contact the application database.
 */
import { readFileSync, writeFileSync } from "node:fs";
const source = "https://huggingface.co/datasets/yjg30737/onepiece-characters/resolve/main/data.json";
const response = await fetch(source);
if (!response.ok) throw new Error("Debut source returned " + response.status);
const people = await response.json();
const cards = JSON.parse(readFileSync(new URL("../lib/catalog/op01.json", import.meta.url), "utf8"));
const norm = s => s.toLowerCase().replace(/[^a-z]/g, "");
const aliases = {
  "Trafalgar Law": "Trafalgar D. Water Law", "Jinbe": "Jimbei", "Kouzuki Oden": "Kozuki Oden",
  "Okiku": "Kikunojo", "Kanjuro": "Kurozumi Kanjuro", "Kouzuki Momonosuke": "Kozuki Momonosuke",
  "Komurasaki": "Kozuki Hiyori", 'Eustass"Captain"Kid': "Eustass Kid", "Ms. All Sunday": "Nico Robin",
  "Miss Doublefinger(Zala)": "Ms. Doublefinger/Paula", "Mr.1(Daz.Bonez)": "Daz Bonez",
  "Mr.2.Bon.Kurei(Bentham)": "Bentham", "Mr.3(Galdino)": "Mr. 3/Galdino",
  "Kyoshirou": "Denjiro", "Hitokiri Kamazo": "Killer", "Holedem": "Holdem"
};
const wikiAliases = {
  "Trafalgar Law": "Trafalgar_D._Water_Law", "Monkey.D.Luffy": "Monkey_D._Luffy",
  "Otama": "Kurozumi_Tama", "Tony Tony.Chopper": "Tony_Tony_Chopper", "Jinbe": "Jinbe",
  "Okiku": "Kikunojo", "Otsuru": "Tsurujo", "Komurasaki": "Kouzuki_Hiyori",
  "Kanjuro": "Kurozumi_Kanjuro", 'Eustass"Captain"Kid': "Eustass_Kid",
  "Kaido": "Kaidou", "Ms. All Sunday": "Nico_Robin", "Miss Doublefinger(Zala)": "Zala",
  "Mr.1(Daz.Bonez)": "Daz_Bonez", "Mr.2.Bon.Kurei(Bentham)": "Bentham", "Mr.3(Galdino)": "Galdino",
  "Kyoshirou": "Denjiro", "Hitokiri Kamazo": "Killer", "Who's.Who": "Who's-Who",
  "X.Drake": "X_Drake", "Holedem": "Holed'em", "Izo": "Izou"
};
const notes = {
  "Roronoa Zoro": "The anime includes an early glimpse in episode 1; his Shells Town introduction follows in episode 2.",
  "Nami": "Manga story debut: chapter 8. She also appears on the chapter 1 cover. The anime introduces her earlier.",
  "Uta": "A manga silhouette appears in a chapter 1055 flashback. Her main story belongs to Film: Red; episode 1029 is a film tie-in.",
  "Kouzuki Oden": "The early appearance is a silhouette in a flashback; the full introduction follows in chapter 960.",
  "Ashura Doji": "The first appearance is a flashback silhouette; Shutenmaru appears fully in chapter 921.",
  "Kawamatsu": "The first appearance is a flashback silhouette; the full reveal comes in chapter 948.",
  "Kanjuro": "The first appearance is a silhouette. The full introduction follows in chapter 754.",
  "Komurasaki": "This records the character's earlier appearance; the Komurasaki introduction follows in chapter 928.",
  "Denjiro": "First appears under another identity. The source article contains the later reveal.",
  "King": "The first appearance is a silhouette. King is fully introduced in chapter 925 / episode 918.",
  "Queen": "The first appearance is a silhouette. Queen is fully introduced in chapter 925 / episode 918.",
  "Yamato": "An early flashback glimpse is cataloged in chapter 971. The present-day masked entrance is chapter 983; the full introduction is chapter 984.",
  "Sasaki": "The anime includes a silhouette in episode 954; the full appearance follows in episode 982.",
  "Who's.Who": "The anime includes a silhouette in episode 954; the full appearance follows in episode 982.",
  "Hitokiri Kamazo": "These numbers refer to the character behind the Kamazo identity. The story and source contain that reveal."
};
const output = {};
for (const card of cards.filter(c=>c.type !== "Event")) {
  if (card.name === "Gordon") {
    output[card.id] = { chapter: null, episode: null, debut: "One Piece Film: Red (2022)", note: "Film character; no numbered manga or television debut is assigned.", source: "https://onepiece.fandom.com/wiki/Gordon" };
    continue;
  }
  const name = norm(aliases[card.name] || card.name);
  let matches = people.filter(p => [p["Official English Name"], p["Romanized Name"]].filter(Boolean).some(n => norm(n) === name));
  if (!matches.length) matches = people.filter(p => [p["Official English Name"], p["Romanized Name"]].filter(Boolean).some(n => norm(n).startsWith(name)));
  if (matches.length !== 1) throw new Error("Ambiguous/missing character: " + card.name);
  const debut = matches[0].Debut || matches[0]["First Appearance"];
  if (!debut) throw new Error("Missing debut: " + card.name);
  output[card.id] = {
    chapter: Number(debut.match(/Chapter (\d+)/)?.[1]) || null,
    episode: Number(debut.match(/Episode (\d+)/)?.[1]) || null,
    debut,
    note: notes[card.name] || null,
    source: "https://onepiece.fandom.com/wiki/" + (wikiAliases[card.name] || card.name.replaceAll(" ", "_"))
  };
}
writeFileSync(new URL("../lib/journey/debuts.json", import.meta.url), JSON.stringify(output, null, 2) + "\n");
console.log("Wrote " + Object.keys(output).length + " character/leader debut records.");
