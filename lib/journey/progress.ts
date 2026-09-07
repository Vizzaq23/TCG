"use client";
import { useSyncExternalStore } from "react";
import { parseJourneyProgress } from "./progress-data";

const key = "tcg-shelf:journey:explored";
const legacyKey = "tcg-shelf:journey:op01:explored";
const eventName = "journey-progress-changed";
let memory = "[]";
let memoryOnly = false;
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(eventName, callback);
  };
}
function snapshot() {
  if (memoryOnly) return memory;
  try { return window.localStorage.getItem(key) ?? window.localStorage.getItem(legacyKey) ?? memory; }
  catch { return memory; }
}
export function useJourneyProgress() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const explored = parseJourneyProgress(raw);
  function toggle(id: string) {
    const current = parseJourneyProgress(snapshot());
    memory = JSON.stringify(current.includes(id) ? current.filter(v=>v!==id) : [...current,id]);
    try { window.localStorage.setItem(key, memory); }
    catch { memoryOnly = true; }
    window.dispatchEvent(new Event(eventName));
  }
  return { explored, toggle };
}
