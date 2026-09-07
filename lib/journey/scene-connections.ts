import chapterIndex from "./chapters.json";

export type MangaChapter = { number: number; title: string | null; url: string };

export const mangaChapters: readonly MangaChapter[] = chapterIndex.chapters;
export const chapterIndexSource = chapterIndex.source;
export const chapterIndexRetrievedAt = chapterIndex.retrievedAt;
const chaptersByNumber = new Map(mangaChapters.map(chapter => [chapter.number, chapter]));

/** Returns only chapters present in the checked source index; never fabricates a URL. */
export function getChapter(number: number | null | undefined): MangaChapter | undefined {
  return number == null ? undefined : chaptersByNumber.get(number);
}

export type SceneConnection = {
  chapter: number;
  title: string;
  summary: string;
  source: string;
  note: string;
  exactness: "confirmed" | "context";
  evidence: string[];
  verifiedPrintings: string[];
};

type SceneEntry = [
  baseId: string,
  chapter: number,
  title: string,
  summary: string,
  note: string,
  exactness: SceneConnection["exactness"],
];

// Editorial summaries, checked against the chapter references and Bandai's
// regular-print card art on 2026-09-07. The image evidence identifies the card,
// not an independently licensed manga page. No scan pages are bundled here.
const entries: SceneEntry[] = [
  ["OP01-026", 644, "A flame beneath the sea",
    "Noah hangs above Fish-Man Island. Inside his protective bubble, Luffy drives a flaming fist through Hody's defenses. Red Hawk turns a desperate underwater fight into one of his most memorable post-training attacks.",
    "The regular event artwork depicts Red Hawk striking Hody Jones. Chapter 644 contains the technique's first use.", "confirmed"],
  ["OP01-030", 597, "Eight voices. One promise.",
    "The Straw Hats are scattered across the world, but they understand their captain's message. The reunion will wait two years. Each of them chooses to grow strong enough to stand beside Luffy when the voyage resumes.",
    "The regular event artwork assembles the crew's responses to the 3D2Y message from chapter 597.", "confirmed"],
  ["OP01-119", 923, "One strike from an emperor",
    "Luffy attacks Kaido with everything he has. Then a single swing of the emperor's club ends the fight. The silence after Thunder Bagua measures how much farther Luffy must climb in Wano.",
    "The regular event artwork shows Kaido standing after striking Gear 4 Luffy, matching Thunder Bagua's first named use in chapter 923.", "confirmed"],
  ["EB01-050", 398, "The words that change everything",
    "At Enies Lobby, Robin finally says the wish she has spent her life burying. Across the abyss, her friends have already chosen her. The burning government flag makes their answer visible to the whole world.",
    "The regular event artwork reproduces Robin's tearful declaration at Enies Lobby in chapter 398. This is a scene connection, not her character debut.", "confirmed"],
  ["OP06-096", 485, "A captain's pain. A swordsman's silence.",
    "After Thriller Bark's battle, Kuma gives Zoro an impossible choice. Zoro takes his unconscious captain's pain on top of his own. When Sanji finds him still standing, he refuses to turn that sacrifice into a story about himself.",
    "The regular event artwork shows Zoro's bloodied reply to Sanji, the closing moment of chapter 485.", "confirmed"],
  ["OP04-093", 790, "Dressrosa breaks free",
    "Above a city held in Doflamingo's grip, Luffy compresses everything into one final punch. King Kong Gun overwhelms the strings and sends the tyrant crashing down. The force tears through the cityscape below.",
    "The regular event artwork depicts the impact and broken Dressrosa streets from King Kong Gun's finishing strike in chapter 790.", "confirmed"],
  ["OP10-019", 1079, "The future Shanks refuses to allow",
    "Near Elbaf, Kid prepares an attack on the Red Hair fleet. Shanks sees the devastation ahead and moves before it can happen. Divine Departure stops Kid and Killer together in a single intervention.",
    "The regular event artwork shows Shanks striking Kid. This is chapter 1079, separate from Roger's earlier use of the same technique.", "confirmed"],
  ["OP13-076", 966, "Before the title, the legend",
    "Oden charges toward the Roger Pirates and meets their captain head-on. Roger's Divine Departure sends him flying. Moments later, Roger and Whitebeard clash as Oden witnesses a level of combat he has never seen.",
    "The regular event artwork shows Roger's slash hitting Oden in chapter 966. It is not Shanks's Divine Departure scene.", "confirmed"],
  ["OP08-053", 574, "The answer Ace found at sea",
    "As the battle rages at Marineford, Ace's thoughts settle on the people who made room for him. His final words to Luffy carry gratitude for the family and love he once doubted he deserved.",
    "The regular event artwork reproduces Ace's final expression and thanks in chapter 574. The chapter contains his death.", "confirmed"],
  ["OP02-023", 563, "A father opens his arms",
    "Squard has been deceived into striking Whitebeard. Expecting punishment, he receives an embrace instead. In the middle of Marineford's war, Whitebeard answers betrayal by reminding his crew what being his sons means.",
    "The regular event artwork shows Whitebeard embracing Squard after the stabbing, the forgiveness scene in chapter 563.", "confirmed"],
  ["EB02-059", 844, "A seat no one else can fill",
    "Sanji tries to drive his captain away, but Luffy sees the pain beneath the performance. Bruised and hungry, he promises to wait. Becoming Pirate King means nothing to him if his cook is missing from the crew.",
    "The regular event artwork combines Luffy's declaration and Sanji's tearful reaction at the end of chapter 844.", "confirmed"],
  ["OP12-115", 767, "Remember the smile",
    "On a snow-covered island, Corazon hides Law where Doflamingo cannot see him. Before facing his brother, he leaves the boy a smile and a simple declaration of love. His silence gives Law a chance to escape.",
    "The regular event artwork shows Corazon smiling at Law in chapter 767. The chapter continues through his sacrifice.", "confirmed"],
  ["OP05-119", 1044, "The drums of liberation",
    "A heartbeat returns to Onigashima's rooftop. Luffy rises laughing as his awakened power turns even the ground into a playground. Gear 5 begins here, and the fight against Kaido takes an entirely new shape.",
    "Form context: Gear 5 debuts in chapter 1044. The regular OP05-119 illustration is credited to TAPIOCA; this is not a claim that its pose is copied from a particular manga panel.", "context"],
  ["OP09-118", 967, "The island at the end of the map",
    "With Oden able to read the stones, Roger's crew completes the route through the Grand Line. At its final island, the treasure they find makes them laugh. Roger gives that place the name Laugh Tale.",
    "Character milestone: Roger reaches Laugh Tale in chapter 967. The regular OP09-118 battle illustration is credited to TAPIOCA and does not depict this scene.", "context"],
  ["OP01-016", 81, "Let someone carry the weight",
    "Arlong's broken promise leaves Nami with nowhere to turn. After years of trying to save her village alone, she asks Luffy for help. He places his hat on her head before the crew walks toward Arlong Park.",
    "Character milestone, not artwork origin: this chapter follows Nami's plea for help. The regular OP01-016 card instead shows her later, post-training appearance.", "context"],
  ["OP01-120", 1, "A promise under a straw hat",
    "At Foosha Village, Shanks leaves Luffy something more lasting than a pirate story. The hat comes with a promise: they will meet again after Luffy becomes a great pirate. An entire voyage grows from that farewell.",
    "Character milestone, not artwork origin: chapter 1 contains Shanks's farewell. The regular OP01-120 illustration, credited to Makitoshi, is an original battle portrait.", "context"],
];

/** Confirmed means the inspected regular printing depicts that story scene. */
export const sceneConnections: Record<string, SceneConnection> = Object.fromEntries(
  entries.map(([baseId, chapter, title, summary, note, exactness]) => {
    const chapterInfo = getChapter(chapter);
    if (!chapterInfo) throw new Error(`Missing source chapter ${chapter}`);
    return [baseId, {
      chapter, title, summary, note, exactness,
      source: chapterInfo.url,
      evidence: [
        `https://en.onepiece-cardgame.com/images/cardlist/card/${baseId}.png`,
        `https://onepiece.fandom.com/wiki/Chapter_${chapter}`,
      ],
      verifiedPrintings: exactness === "confirmed" ? [baseId] : [],
    }];
  }),
);

/** Alternate art shares a card number, but must not inherit a panel-match claim. */
export function getSceneConnection(baseId: string, printingId = baseId): SceneConnection | undefined {
  const connection = sceneConnections[baseId];
  if (!connection || connection.exactness === "context" || connection.verifiedPrintings.includes(printingId)) return connection;
  return {
    ...connection,
    exactness: "context",
    note: `This chapter connection was verified for the regular ${baseId} artwork. This printing uses a different or unverified illustration; its exact manga panel has not been established.`,
  };
}
