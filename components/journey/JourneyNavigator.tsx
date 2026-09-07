"use client";

import { useEffect, useRef, useState } from "react";
import type { JourneyEntry } from "@/lib/journey/types";

type Props = {
  card: JourneyEntry | null;
  seen: string[];
  canGoBack: boolean;
  onBack: () => void;
  onEncounter: (card: JourneyEntry) => void;
};

export function JourneyNavigator({ card, seen, canGoBack, onBack, onEncounter }: Props) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [manualLink, setManualLink] = useState("");
  const request = useRef<AbortController | null>(null);
  const shareAttempt = useRef(0);
  useEffect(() => () => { request.current?.abort(); shareAttempt.current += 1; }, []);

  async function encounter() {
    if (pending) return;
    setPending(true);
    setMessage("");
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/journey/encounter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: card?.id, seen: [...new Set(seen)].slice(-1000) }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Your next encounter couldn’t load. Try again.");
      const result = await response.json() as { selected: JourneyEntry | null };
      if (controller.signal.aborted) return;
      if (result.selected) onEncounter(result.selected);
      else setMessage("No other mapped stories are available yet.");
    } catch (error) {
      setMessage(controller.signal.aborted ? "The encounter timed out. Try again." : error instanceof Error ? error.message : "Your next encounter couldn’t load. Try again.");
    } finally {
      window.clearTimeout(timeout);
      setPending(false);
    }
  }

  async function copyStory() {
    if (!card) return;
    const attempt = ++shareAttempt.current;
    const url = new URL("/journey", window.location.origin);
    url.searchParams.set("card", card.id);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url.toString());
      if (attempt !== shareAttempt.current) return;
      setCopied(true); setManualLink("");
    } catch {
      if (attempt === shareAttempt.current) setManualLink(url.toString());
    }
  }

  return <div className="mj-navigation">
    <div className="mj-log-pose" aria-hidden="true"><span>↗</span><i>N</i><b>LOG POSE</b></div>
    <div className="mj-navigation-heading"><span className="mj-eyebrow">LET CURIOSITY SET THE COURSE</span><strong>ANOTHER CARD.<br/>ANOTHER ADVENTURE.</strong><p>Discover a story you haven’t explored.</p></div>
    <div className="mj-navigation-actions">
      <button className="mj-button mj-button-red mj-encounter-button" type="button" onClick={encounter} disabled={pending} aria-busy={pending}><span>{pending ? "FINDING A STORY…" : "RANDOM ENCOUNTER"}</span><span aria-hidden="true">↗</span></button>
      <div className="mj-navigation-secondary"><button type="button" disabled={!canGoBack || pending} onClick={onBack}>← Previous discovery</button><button type="button" disabled={!card || pending} onClick={copyStory}>{copied ? "✓ Link copied" : "Copy story link ↗"}</button></div>
      {message && <p className="mj-navigation-message" role="status">{message}</p>}
      {copied && <span className="sr-only" role="status">Story link copied to clipboard.</span>}
      {manualLink && <label className="mj-copy-fallback">Copy this story link<input readOnly value={manualLink} onFocus={event=>event.target.select()}/></label>}
    </div>
  </div>;
}
