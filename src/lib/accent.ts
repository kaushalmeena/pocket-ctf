import { createSignal, onMount } from "solid-js";

import { storage } from "./storage";

/**
 * Accent palettes. Each is one hue and a chroma factor; app.css derives the
 * whole 50-950 scale from those two numbers, so a palette is a line here and a
 * rule there.
 */
export const ACCENTS = [
  { id: "emerald", label: "Emerald", hue: 165, chroma: 1 },
  { id: "sky", label: "Sky", hue: 235, chroma: 0.95 },
  { id: "violet", label: "Violet", hue: 295, chroma: 1.1 },
  { id: "rose", label: "Rose", hue: 10, chroma: 1.05 },
  { id: "amber", label: "Amber", hue: 75, chroma: 1.05 },
  { id: "lime", label: "Lime", hue: 128, chroma: 1 },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

const STORAGE_KEY = "pctf:accent";
const IDS = ACCENTS.map((a) => a.id);

/**
 * Inlined into <head>, like the theme bootstrap, so the accent is on <html>
 * before first paint. A first visit has no stored choice: it is dealt one at
 * random and keeps it, which makes two players' screens look subtly different
 * from the start.
 */
export const ACCENT_BOOTSTRAP = `(function(){var l=${JSON.stringify(IDS)},a;try{a=localStorage.getItem("${STORAGE_KEY}");if(l.indexOf(a)<0){a=l[Math.floor(Math.random()*l.length)];localStorage.setItem("${STORAGE_KEY}",a)}}catch(e){a=a||l[0]}document.documentElement.dataset.accent=a})();`;

const isAccent = (value: string | null | undefined): value is AccentId =>
  IDS.includes(value as AccentId);

export function useAccent() {
  const [accent, setAccent] = createSignal<AccentId>("emerald");

  // The bootstrap already chose and painted; this just reads what it chose.
  onMount(() => {
    const painted = document.documentElement.dataset.accent;
    if (isAccent(painted)) setAccent(painted);
  });

  const choose = (next: AccentId) => {
    document.documentElement.dataset.accent = next;
    storage.set(STORAGE_KEY, next);
    setAccent(next);
  };

  /** The palette after the current one, wrapping. */
  const cycle = () => {
    const at = IDS.indexOf(accent());
    choose(IDS[(at + 1) % IDS.length]!);
  };

  const current = () => ACCENTS.find((a) => a.id === accent()) ?? ACCENTS[0];

  return { accent, current, choose, cycle };
}
