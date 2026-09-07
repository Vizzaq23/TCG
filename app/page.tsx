import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageContainer } from "@/components/ui/PageContainer";
import "./home.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  description: "Every card has an origin story. Explore the One Piece card catalog, follow the manga journey, and build your collection.",
};

const destinations = [
  { number: "01", label: "THE CARD ARCHIVE", title: "Find your next obsession.", text: "Search the whole catalog. From the first set to your next grail, the hunt starts here.", href: "/browse", action: "Explore all cards", card: "OP01-025", name: "Roronoa Zoro" },
  { number: "02", label: "YOUR COLLECTION", title: "Build a legendary shelf.", text: "Every pull, every trade, every hard-earned favorite. Give your collection its own story.", href: "/collection", action: "Open my collection", card: "OP01-016", name: "Nami" },
  { number: "03", label: "THE COLLECTORS", title: "Every pirate needs a crew.", text: "Meet other collectors, discover their shelves, and find the card that completes yours.", href: "/social", action: "Find your people", card: "OP01-120", name: "Shanks" },
];

export default function HomePage() {
  return (
    <main className="manga-home flex flex-1 flex-col">
      <PageContainer>
        <div className="manga-home-masthead">
          <span><i aria-hidden /> THE ONE PIECE COLLECTOR’S COMPANION</span>
          <span>CARDS. CHAPTERS. ADVENTURE.</span>
        </div>
        <section className="manga-home-hero" aria-labelledby="home-title">
          <div className="manga-home-copy">
            <p className="manga-home-eyebrow">THE STORY IS BIGGER THAN THE CARD.</p>
            <h1 id="home-title">EVERY CARD.<br />AN <span>EPIC</span><br />ORIGIN.</h1>
            <p className="manga-home-intro">The faces you collect. The moments you remember. Step into the story behind One Piece, one card at a time.</p>
            <div className="manga-home-actions">
              <Link className="manga-home-button" href="/journey">Enter the Journey <span aria-hidden>↗</span></Link>
              <Link className="manga-home-button manga-home-button-outline" href="/browse">Explore all cards <span aria-hidden>→</span></Link>
            </div>
            <nav className="manga-home-quicklinks" aria-label="Explore catalog highlights"><span>FRESH PAGES</span><Link href="/browse?q=OP-17">OP-17 ↗</Link><Link href="/browse?q=promos">Promo archive ↗</Link></nav>
            <div className="manga-home-hero-note"><span aria-hidden>01</span><p>FROM ROMANCE DAWN<br /><strong>TO THE NEXT CHAPTER.</strong></p></div>
          </div>
          <div className="manga-home-spread" aria-label="One Piece card artwork arranged as a manga page">
            <div className="manga-home-spread-top"><span>THE ADVENTURE NEVER ENDS</span><span>↙ READ THE STORY</span></div>
            <Link href="/journey?card=EB01-050" className="manga-home-panel manga-home-panel-robin" aria-label="Explore the story behind I Want to Live in Journey">
              <Image src="/cards/EB01-050.png" alt="Robin in the manga scene reproduced on the official I Want to Live card" width={600} height={838} sizes="(max-width: 760px) 85vw, 42vw" loading="eager" />
              <span className="manga-home-caption">THE MOMENTS THAT STAY WITH YOU.</span>
              <span className="manga-home-panel-number" aria-hidden>01</span>
            </Link>
            <div className="manga-home-spread-bottom">
              <Link href="/journey?card=OP01-026" className="manga-home-panel manga-home-panel-redhawk" aria-label="Explore the story behind Red Hawk in Journey">
                <Image src="/cards/OP01-026.png" alt="Red Hawk manga scene on the official One Piece card" width={600} height={838} sizes="(max-width: 760px) 42vw, 21vw" />
                <span className="manga-home-caption">EVERY BATTLE.</span>
              </Link>
              <Link href="/journey?card=OP01-030" className="manga-home-panel manga-home-panel-crew" aria-label="Explore the story behind the crew's two year promise in Journey">
                <Image src="/cards/OP01-030.png" alt="Straw Hat crew manga panels on the official In Two Years card" width={600} height={838} sizes="(max-width: 760px) 42vw, 21vw" />
                <span className="manga-home-caption">EVERY PROMISE.</span>
              </Link>
            </div>
            <span className="manga-home-impact" aria-hidden>ドン!!</span>
            <div className="manga-home-spread-foot"><span>MANGA SCENES / OFFICIAL BANDAI CARD ART</span><span>→</span></div>
          </div>
        </section>
      </PageContainer>
      <div className="manga-home-ticker" aria-label="Collect the cards. Relive the story. Find your crew.">
        <span>COLLECT THE CARDS</span><i aria-hidden>✦</i><span>RELIVE THE STORY</span><i aria-hidden>✦</i><span>FIND YOUR CREW</span><i aria-hidden>✦</i><span aria-hidden>TO BE CONTINUED</span>
      </div>
      <PageContainer>
        <section className="manga-home-destinations" aria-labelledby="destinations-title">
          <div className="manga-home-section-heading">
            <div><p className="manga-home-eyebrow">YOUR NEXT CHAPTER</p><h2 id="destinations-title">CHOOSE YOUR ADVENTURE.</h2></div>
            <span className="manga-home-section-index" aria-hidden>CONTENTS / 01—03</span>
          </div>
          <div className="manga-home-destination-grid">
            {destinations.map((item) => (
              <Link key={item.number} href={item.href} className="manga-home-destination">
                <div className="manga-home-destination-art"><Image src={`/cards/${item.card}.png`} alt={`${item.name} official card artwork`} width={600} height={838} sizes="(max-width: 760px) 90vw, 30vw" /><span>{item.number}</span></div>
                <div className="manga-home-destination-body"><p className="manga-home-eyebrow">{item.label}</p><h3>{item.title}</h3><p>{item.text}</p><span className="manga-home-text-link">{item.action}<span aria-hidden>↗</span></span></div>
              </Link>
            ))}
          </div>
        </section>
        <section className="manga-home-journey" aria-labelledby="journey-invitation-title">
          <div className="manga-home-journey-card">
            <div className="manga-home-journey-card-label"><span>THE CARD</span><span>↘</span></div>
            <Image src="/cards/OP01-120.png" alt="Shanks, One Piece TCG card OP01-120" width={600} height={838} sizes="(max-width: 760px) 60vw, 25vw" />
            <span className="manga-home-card-tag">SHANKS / OP01-120</span>
          </div>
          <div className="manga-home-journey-copy">
            <p className="manga-home-eyebrow">INTRODUCING / JOURNEY</p>
            <h2 id="journey-invitation-title">BEFORE THE CARD.<br /><span>THERE WAS<br />THE STORY.</span></h2>
            <p>A straw hat. A promise. An entire world waiting beyond the shore. Follow the people and moments behind your cards through Eiichiro Oda’s One Piece.</p>
            <div className="manga-home-journey-features"><span>CHARACTER ORIGINS</span><span>STORY CONNECTIONS</span><span>THE WHOLE CATALOG</span></div>
            <Link href="/journey" className="manga-home-button">Turn the first page <span aria-hidden>↗</span></Link>
          </div>
        </section>
        <section className="manga-home-closing">
          <p>YOUR NEXT GREAT FIND<br /><span>IS OUT THERE.</span></p>
          <Link href="/shop" className="manga-home-button manga-home-button-outline">Find your next pull <span aria-hidden>↗</span></Link>
          <span className="manga-home-continued" aria-hidden>TO BE CONTINUED <b>→</b></span>
        </section>
      </PageContainer>
    </main>
  );
}
