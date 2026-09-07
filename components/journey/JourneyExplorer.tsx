"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CardImage } from "@/components/cards/CardImage";
import { PageContainer } from "@/components/ui/PageContainer";
import { JourneyNavigator } from "./JourneyNavigator";
import { appendDiscovery } from "@/lib/journey/history";
import { useJourneyProgress } from "@/lib/journey/progress";
import { getChapter, getSceneConnection, mangaChapters } from "@/lib/journey/scene-connections";
import type { JourneyArchiveResponse, JourneyEntry } from "@/lib/journey/types";

export type ArchiveFilters = { q: string; set: string; type: string; language: string; order: "card" | "story"; page: number };
const number = (value: number) => value.toLocaleString("en-US");
const cardName = (name: string) => name.replaceAll("Monkey.D.", "Monkey D. ").replaceAll("Tony Tony.", "Tony Tony ").replaceAll('Eustass"Captain"Kid', 'Eustass “Captain” Kid');
const typeColors: Record<string,string> = { Red:"#d62d35",Green:"#478350",Blue:"#30689c",Purple:"#806298",Black:"#191919",Yellow:"#d6a52d" };
const iconicMoments = [
  { card: "OP01-026", label: "RED HAWK", chapter: 644 },
  { card: "EB01-050", label: "I WANT TO LIVE", chapter: 398 },
  { card: "OP06-096", label: "NOTHING HAPPENED", chapter: 485 },
  { card: "OP05-119", label: "GEAR FIVE", chapter: 1044 },
];

function storyLabel(card: JourneyEntry): string {
  if (card.referenceKind === "special") return card.referenceLabel ?? "SPECIAL MANGA CHAPTER";
  if (card.referenceKind === "mention") return "MENTION · CH. " + card.chapter;
  if (card.storyChapter !== null) return (card.entryKind === "Character debut" && card.storyChapter === card.chapter ? "DEBUT" : "STORY") + " · CH. " + card.storyChapter;
  return card.entryKind === "Uncharted" ? "ORIGIN UNCHARTED" : card.arc;
}

function JourneyArtwork({ card, className, detail = false, eager = false }: { card: JourneyEntry; className: string; detail?: boolean; eager?: boolean }) {
  if (!card.image) return <div className={"mj-art-unavailable " + className}><strong>?!</strong><span>ARTWORK UNAVAILABLE</span></div>;
  return <CardImage key={card.id} src={card.image} alt={(detail ? "Monochrome detail of " : "") + cardName(card.name) + " — " + card.id} className={className} loading={eager ? "eager" : "lazy"} sharpen={false}/>;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg>;
}

function MangaSpread({ card, hideSpoilers, explored, onToggle }: { card: JourneyEntry; hideSpoilers: boolean; explored: boolean; onToggle: () => void }) {
  const scene = getSceneConnection(card.baseId, card.id);
  const chapter = getChapter(scene?.chapter ?? card.chapter);
  const debut = getChapter(card.chapter);
  const exactScene = scene?.exactness === "confirmed";
  const title = hideSpoilers ? "The next page is yours." : scene?.title ?? card.title;
  const contextLabel = exactScene ? "SCENE CONNECTION" : scene ? "STORY CONNECTION" : card.entryKind === "Character debut" ? "CHARACTER DEBUT" : card.entryKind === "Character reference" ? "CHARACTER REFERENCE" : card.entryKind === "Uncharted" ? "ORIGIN NOT YET MAPPED" : "SCENE GUIDE";
  return <div className="mj-spread">
    <div className="mj-story-side">
      <div className="mj-panel-top"><span>{contextLabel}</span><span>{chapter ? "CH. " + String(chapter.number).padStart(4,"0") : "EXTRA LOG"} <i aria-hidden>↙</i></span></div>
      <div className="mj-scene-panel">
        <div className="mj-scene-art-wrap"><JourneyArtwork card={card} className="mj-scene-art" detail eager/></div>
        <span className="mj-art-source">CARD ART</span>
        <div className="mj-scene-chapter" aria-hidden><span>{chapter ? "CHAPTER" : "THE ARCHIVE"}</span><strong>{chapter ? String(chapter.number).padStart(3,"0") : "?"}</strong></div>
        <div className="mj-scene-title"><span>{hideSpoilers ? "THE ADVENTURE CONTINUES" : card.arc}</span><h2>{title}</h2></div>
        <span className="mj-sound-effect" aria-hidden>ドン!!</span>
      </div>
      <div className="mj-narration-panel">
        <div className="mj-narration-number" aria-hidden>01<span>THE STORY</span></div>
        <div><p className="mj-eyebrow">{hideSpoilers ? "STORY NOTES HIDDEN" : scene ? "BEHIND THE MOMENT" : "FOLLOW THE THREAD"}</p><p className="mj-narration">{hideSpoilers ? "Turn off “Hide story spoilers” above to read the story behind this card. Card names and artwork remain visible." : scene?.summary ?? card.text}</p>
        {!hideSpoilers && <p className="mj-context-note">{scene ? scene.note : card.entryKind === "Character debut" ? "This is the character’s first recorded appearance, not a confirmed origin for this particular illustration." : card.detail}</p>}</div>
      </div>
      {!hideSpoilers && <div className="mj-notes-panel"><span className="mj-notes-star" aria-hidden>✦</span><div><h3>IN THE MARGINS</h3><p>{card.detail}</p>{card.note && <p className="mj-context-note">{card.note}</p>}</div></div>}
    </div>
    <aside className="mj-card-side" aria-label="Selected card">
      <div className="mj-card-heading"><span>THE CARD</span><span>{card.originSet}</span></div>
      <div className="mj-full-card-wrap"><JourneyArtwork card={card} className="mj-full-card" eager/><span className="mj-printing-stamp">{card.marketplaceIdentity === "marketplace-printing" ? "TCGPLAYER PRINTING" : card.type === "DON!!" ? "DON!! ART" : card.language === "ja" ? "JAPANESE PRINT" : card.id===card.baseId ? "ORIGINAL PRINT" : "ALT / REPRINT"}</span></div>
      <div className="mj-card-caption"><span>{card.id}</span><span>{card.rarity.replace(/([a-z])([A-Z])/g,"$1 $2")}</span></div>
      <h3>{cardName(card.name)}</h3>
      <div className="mj-card-tags"><span>{card.type}</span>{card.colors.map(color=><span key={color}><i style={{background:typeColors[color] ?? "#333"}}/>{color}</span>)}</div>
      <p className="mj-set-name">{card.setLabel}</p>{card.originalName && card.originalName !== card.name && <p className="mj-original-name" lang="ja">{card.originalName}</p>}
      <div className="mj-source-facts">
        <div><span>{scene ? "STORY CHAPTER" : card.referenceKind === "special" ? "SPECIAL MANGA CHAPTER" : card.referenceKind === "mention" ? "FIRST INDEXED MENTION" : card.entryKind === "Character debut" ? "FIRST MANGA APPEARANCE" : "STORY CHAPTER"}</span><strong>{chapter ? String(chapter.number).padStart(3,"0") : card.referenceKind === "special" ? "0" : "Uncharted"}</strong></div>
        {scene && card.entryKind === "Character debut" && debut && debut.number!==chapter?.number && <div><span>CHARACTER DEBUT</span><strong>CH. {debut.number}</strong></div>}
        {!scene && card.entryKind === "Character debut" && card.episode && <div><span>FIRST ANIME APPEARANCE</span><strong>EP. {card.episode}</strong></div>}
      </div>
      {chapter ? <a className="mj-button mj-button-red" href={chapter.url} target="_blank" rel="noreferrer">OPEN CHAPTER {chapter.number}<span aria-hidden>↗</span><small>READ ON TCB SCANS</small></a> : card.referenceKind === "special" ? <a className="mj-button mj-button-ink" href={card.source} target="_blank" rel="noreferrer">SPECIAL CHAPTER REFERENCE ↗</a> : <div className="mj-unmapped-note">No verified manga chapter assigned yet. This card remains in the archive while its origin is researched.</div>}
      <button type="button" className={"mj-button mj-button-paper mj-explored " + (explored ? "is-explored" : "")} onClick={onToggle} aria-pressed={explored}><span>{explored ? "✓" : "+"} {explored ? "EXPLORED — UNDO" : "MARK AS EXPLORED"}</span></button>
      <div className="mj-card-links">{card.tcgplayerUrl && <a href={card.tcgplayerUrl} target="_blank" rel="noreferrer">View this printing on TCGplayer ↗</a>}<Link href={"/browse/resolve?"+new URLSearchParams({number:card.id,...(card.tcgplayerProductId ? {product:String(card.tcgplayerProductId)} : {})}).toString()}>View collectible card ↗</Link>{(scene?.source || card.source) && !hideSpoilers && <a href={scene?.source || card.source} target="_blank" rel="noreferrer">Story reference ↗</a>}</div>
    </aside>
  </div>;
}

export function JourneyExplorer({ initialArchive, initialFilters }: { initialArchive: JourneyArchiveResponse; initialFilters: ArchiveFilters }) {
  const [archive,setArchive] = useState(initialArchive);
  const [selected,setSelected] = useState(initialArchive.selected);
  const [history,setHistory] = useState<JourneyEntry[]>(initialArchive.selected ? [initialArchive.selected] : []);
  const [filters,setFilters] = useState(initialFilters);
  const [hideSpoilers,setHideSpoilers] = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const { explored,toggle } = useJourneyProgress();
  const requestRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serialRef = useRef(0);
  const selectedRef = useRef(initialArchive.selected?.id ?? "");
  const readerRef = useRef<HTMLElement>(null);
  const archiveRef = useRef<HTMLElement>(null);
  const filtersRef = useRef(initialFilters);
  useEffect(()=>()=>{requestRef.current?.abort();if(timerRef.current)clearTimeout(timerRef.current);},[]);

  function updateUrl(next: ArchiveFilters, card: string) {
    const url = new URL(window.location.href);
    for (const key of ["q","set","type","language","order","page","card"]) url.searchParams.delete(key);
    if (next.q) url.searchParams.set("q",next.q);
    if (next.set) url.searchParams.set("set",next.set);
    if (next.type) url.searchParams.set("type",next.type);
    if (next.language) url.searchParams.set("language",next.language);
    if (next.order==="story") url.searchParams.set("order","story");
    if (next.page>1) url.searchParams.set("page",String(next.page));
    if (card) url.searchParams.set("card",card);
    window.history.replaceState(null,"",url);
  }

  function loadArchive(next: ArchiveFilters, delay = 0) {
    filtersRef.current=next;setFilters(next);setLoading(true);setError("");
    requestRef.current?.abort();
    if(timerRef.current) clearTimeout(timerRef.current);
    const serial = ++serialRef.current;
    timerRef.current = setTimeout(async()=>{
      const controller = new AbortController();
      requestRef.current = controller;
      const params = new URLSearchParams({q:next.q,set:next.set,type:next.type,language:next.language,order:next.order,page:String(next.page),card:selectedRef.current});
      try {
        const response = await fetch("/api/journey?"+params.toString(),{signal:controller.signal});
        if(!response.ok) throw new Error("The archive could not be loaded.");
        const result: JourneyArchiveResponse = await response.json();
        if(serial!==serialRef.current)return;
        setArchive(result);
        filtersRef.current={...next,page:result.page};
        setFilters({...next,page:result.page});
        updateUrl({...next,page:result.page},selectedRef.current);
      } catch(err) {
        if(controller.signal.aborted || serial!==serialRef.current)return;
        setError(err instanceof Error ? err.message : "The archive could not be loaded.");
      } finally { if(serial===serialRef.current)setLoading(false); }
    },delay);
  }
  function pick(card: JourneyEntry) {
    setHistory(previous=>appendDiscovery(previous,card));
    selectStory(card);
  }
  function selectStory(card: JourneyEntry) {
    setSelected(card);selectedRef.current=card.id;
    updateUrl(filtersRef.current,card.id);
    readerRef.current?.focus({preventScroll:true});
    readerRef.current?.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
  }
  function previousDiscovery() {
    const previous = history.at(-2);
    if (!previous) return;
    setHistory(current=>current.slice(0,-1));
    selectStory(previous);
  }
  function jumpToArchive() {
    archiveRef.current?.focus({preventScroll:true});
    archiveRef.current?.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
  }
  function resetFilters() { loadArchive({q:"",set:"",type:"",language:"",order:"card",page:1}); }
  const pageButtons = [...new Set([1, archive.page-1,archive.page,archive.page+1,archive.totalPages])].filter(page=>page>=1 && page<=archive.totalPages).sort((a,b)=>a-b);
  const from = archive.total ? (archive.page-1)*24+1 : 0;
  const to = Math.min(archive.page*24,archive.total);

  return <main className="manga-journey">
    <PageContainer>
      <div className="mj-folio"><Link href="/">THE COLLECTOR’S SHELF</Link><span>ONE PIECE / JOURNEY</span><span className="mj-folio-right">AN UNOFFICIAL FAN ARCHIVE</span></div>
      <header className="mj-intro">
        <div className="mj-intro-title"><span className="mj-red-tab">THE CARDS. THE CHARACTERS. THE MOMENTS.</span><h1>ENTER<br /><span>THE STORY.</span><i aria-hidden>↙</i></h1></div>
        <div className="mj-intro-copy"><p>A card is a piece of a much bigger adventure.</p><p>Trace the faces, fights, and impossible dreams back into Eiichiro Oda’s One Piece. Start anywhere. Follow the story.</p><button type="button" className="mj-text-action" onClick={jumpToArchive}>EXPLORE EVERY CARD <span aria-hidden>↓</span></button><div className="mj-intro-stats"><div><strong>{number(archive.stats.cards)}</strong><span>CARD PRINTINGS</span></div><div><strong>{number(archive.stats.sets)}</strong><span>PRODUCTS</span></div><div><strong>{number(mangaChapters.length)}</strong><span>CHAPTER LINKS</span></div></div></div>
      </header>
      <nav className="mj-moment-tabs" aria-label="Explore iconic story moments">{iconicMoments.map(moment=><Link key={moment.card} href={"/journey?card="+moment.card} aria-current={selected?.id===moment.card ? "page" : undefined}><small>CH. {moment.chapter}</small><strong>{moment.label}</strong><span aria-hidden>↗</span></Link>)}</nav>
      <JourneyNavigator key={selected?.id ?? "empty"} card={selected} seen={[...explored,...history.map(card=>card.id)]} canGoBack={history.length>1} onBack={previousDiscovery} onEncounter={pick}/>
      <div className="mj-section-bar"><span><i aria-hidden>✦</i> THE STORY BEHIND THE CARD</span><label><input type="checkbox" checked={hideSpoilers} onChange={event=>setHideSpoilers(event.target.checked)}/> Hide story spoilers</label><span className="mj-device-progress" aria-live="polite">{number(explored.length)} explored <small>ON THIS DEVICE</small></span></div>
      <section className="mj-reader-section" ref={readerRef} tabIndex={-1} aria-label="Card story reader">
        {selected ? <MangaSpread key={selected.id} card={selected} hideSpoilers={hideSpoilers} explored={explored.includes(selected.id)} onToggle={()=>toggle(selected.id)}/> : <div className="mj-empty"><h2>CHOOSE YOUR FIRST CARD.</h2><button className="mj-button mj-button-red" type="button" onClick={jumpToArchive}>OPEN THE ARCHIVE ↓</button></div>}
      </section>
      {history.length>1 && <nav className="mj-recent" aria-label="Recently discovered cards"><div><p className="mj-eyebrow">YOUR RECENT DISCOVERIES</p><span>{number(explored.length)} stories marked as explored</span></div><div className="mj-recent-cards">{history.slice(0,-1).slice(-4).reverse().map((card,index)=><button type="button" key={card.id+index} onClick={()=>pick(card)} className="mj-recent-card"><JourneyArtwork card={card} className="mj-recent-art"/><span><strong>{cardName(card.name)}</strong><small>{storyLabel(card)}</small></span><i aria-hidden="true">↗</i></button>)}</div></nav>}
      <div className="mj-interlude" aria-hidden><span>ONE CARD.</span><span>ONE MOMENT.</span><span>ONE PIECE.</span><b>つづく</b></div>
      <section className="mj-archive-section" ref={archiveRef} tabIndex={-1} aria-labelledby="archive-heading">
        <div className="mj-archive-heading"><div><p className="mj-eyebrow">THE CARD ARCHIVE</p><h2 id="archive-heading">PICK YOUR<br /><em>NEXT CHAPTER.</em></h2></div><p>Boosters. Starter decks. Promos. Alternate art. DON!!<br/>Every card in the archive has a place here.</p></div>
        <div className="mj-archive-controls">
          <form className="mj-search" role="search" onSubmit={event=>{event.preventDefault();loadArchive({...filters,page:1});}}><SearchIcon/><input aria-label="Search all cards by name, number, crew, or arc" placeholder="A name. A card number. A crew…" value={filters.q} onChange={event=>loadArchive({...filters,q:event.target.value,page:1},250)}/>{filters.q && <button type="button" aria-label="Clear search" onClick={()=>loadArchive({...filters,q:"",page:1})}>×</button>}</form>
          <label className="mj-filter"><span>PRODUCT</span><select aria-label="Filter by product" value={filters.set} onChange={event=>loadArchive({...filters,set:event.target.value,page:1})}><option value="">Every product ({archive.stats.sets})</option>{archive.sets.map(set=><option key={set.id} value={set.id}>{set.label} · {set.count}</option>)}</select></label>
          <label className="mj-filter"><span>CARD TYPE</span><select aria-label="Filter by card type" value={filters.type} onChange={event=>loadArchive({...filters,type:event.target.value,page:1})}><option value="">Every card type</option>{["Leader","Character","Event","Stage","DON!!","Unspecified"].map(type=><option key={type}>{type}</option>)}</select></label>
          <label className="mj-filter"><span>EDITION</span><select aria-label="Filter by edition" value={filters.language} onChange={event=>loadArchive({...filters,language:event.target.value,page:1})}><option value="">All editions</option><option value="en">English</option><option value="ja">Japanese additions</option><option value="unspecified">Other source records</option></select></label>
          <label className="mj-filter"><span>READING ORDER</span><select aria-label="Sort cards" value={filters.order} onChange={event=>loadArchive({...filters,order:event.target.value as "card"|"story",page:1})}><option value="card">Card number</option><option value="story">Manga chronology</option></select></label>
        </div>
        <div className="mj-result-bar"><p role="status">{loading ? "Turning the page…" : number(from)+"–"+number(to)+" OF "+number(archive.total)+" PRINTINGS"}</p><span>Click a card to step into its story <i aria-hidden>↗</i></span>{(filters.q||filters.set||filters.type||filters.language) && <button type="button" onClick={resetFilters}>Clear filters ×</button>}</div>
        {error && <div className="mj-error" role="alert"><p>{error}</p><button type="button" onClick={()=>loadArchive(filters)}>Try again ↗</button></div>}
        <div className={"mj-card-grid "+(loading?"is-loading":"")} aria-busy={loading}>
          {archive.cards.map(card=><button type="button" className={"mj-archive-card "+(selected?.id===card.id?"is-selected":"")} disabled={loading} key={card.id} onClick={()=>pick(card)} aria-label={"Read the story of "+cardName(card.name)+", "+card.id} aria-pressed={selected?.id===card.id}><div className="mj-grid-art"><JourneyArtwork card={card} className="mj-grid-image"/><span className="mj-grid-type">{card.type}</span>{explored.includes(card.id)&&<span className="mj-grid-explored" aria-label="Explored">✓</span>}<span className="mj-grid-arrow" aria-hidden>↗</span></div><span className="mj-grid-id">{card.id}{card.language === "ja" && <b> · JP</b>}</span><strong>{cardName(card.name)}</strong><small>{storyLabel(card)}</small></button>)}
        </div>
        {!archive.cards.length && !loading && <div className="mj-empty"><span aria-hidden>?!</span><h3>NO CARDS ON THIS PAGE.</h3><p>Try another name, product, or card type.</p><button type="button" className="mj-button mj-button-ink" onClick={resetFilters}>RESET FILTERS ↗</button></div>}
        {archive.totalPages>1 && <nav className="mj-pagination" aria-label="Card archive pages"><button type="button" disabled={loading||archive.page<=1} onClick={()=>loadArchive({...filters,page:archive.page-1})}>← PREVIOUS</button><div>{pageButtons.map((page,index)=><span key={page}>{index>0&&page-pageButtons[index-1]>1&&<span className="mj-page-gap">…</span>}<button type="button" disabled={loading} aria-current={page===archive.page?"page":undefined} aria-label={"Page "+page} onClick={()=>loadArchive({...filters,page})}>{page}</button></span>)}</div><button type="button" disabled={loading||archive.page>=archive.totalPages} onClick={()=>loadArchive({...filters,page:archive.page+1})}>NEXT →</button></nav>}
      </section>
      <footer className="mj-colophon"><div><strong>ODA’S WORLD.<br/>YOUR ADVENTURE.</strong><p>An independent fan-made guide to One Piece and the card game.</p></div><div><p>Card artwork is presented in manga-inspired layouts. Chapter buttons open TCB Scans. A character debut or story connection is not automatically the source of a card’s illustration.</p><p>{number(archive.stats.cards)} printings · {number(archive.stats.baseCards)} card numbers · {number(archive.stats.mapped)} with a chapter reference. Uncharted origins remain labeled. {archive.coverage.note}</p><p>ONE PIECE © Eiichiro Oda / Shueisha, Toei Animation. Card game © Bandai.</p></div></footer>
    </PageContainer>
  </main>;
}
