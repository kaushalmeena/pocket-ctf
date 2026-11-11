import { createSignal, onCleanup, onMount, Show } from "solid-js";

import { useGame } from "~/lib/game";

type Drawer = { name: string; store: string; records: unknown[] };

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

/** What the tab says to an empty chair, one line every couple of seconds. */
const AWAY_TITLES = [
  "Come back…",
  "We hid something while you were gone",
  "(not really)",
  "(or did we)",
  "Still here. Still hiding things.",
];

/** Set by the service worker's offline page; read here once the network is back. */
const OFFLINE_MARK = "pctf-offline";

/** 3:14, morning or afternoon, on the visitor's own clock. */
const isPiOClock = (now = new Date()) => now.getHours() % 12 === 3 && now.getMinutes() === 14;

const GREETING = `
   |>
   |      pocket/ctf
   |
  ~~~     Opening the console was the right instinct.
          Nothing in here is a flag. Several things near here are.
`;

/**
 * The things every page does quietly.
 *
 * It says hello in the console, files a few records in the browser's own
 * storage without mentioning it, listens for one very old cheat code, keeps
 * an eye on the clock, and installs a service worker for when the network goes.
 */
export function Secrets(props: { drawer: Drawer }) {
  const { claim } = useGame();
  const [retro, setRetro] = createSignal(false);
  let progress = 0;

  const handleKey = (event: KeyboardEvent) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0;
    if (progress < KONAMI.length) return;
    progress = 0;
    setRetro((on) => !on);
    void claim("konami");
  };

  /**
   * File the records and say nothing. The page never displays them; they sit
   * in IndexedDB for whoever thinks to open that drawer.
   */
  const fileRecords = () => {
    try {
      const request = indexedDB.open(props.drawer.name, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(props.drawer.store)) {
          request.result.createObjectStore(props.drawer.store, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        const store = database
          .transaction(props.drawer.store, "readwrite")
          .objectStore(props.drawer.store);
        store.clear();
        for (const record of props.drawer.records) store.add(record);
        database.close();
      };
    } catch {
      /* storage unavailable; one hiding place fewer */
    }
  };

  /** Leave the tab and its title starts talking to you. */
  let original = "";
  let nag: ReturnType<typeof setInterval> | undefined;

  const handleVisibility = () => {
    if (document.hidden) {
      original = document.title;
      let line = 0;
      nag = setInterval(() => {
        document.title = AWAY_TITLES[line++ % AWAY_TITLES.length]!;
      }, 2000);
      return;
    }
    clearInterval(nag);
    if (original) document.title = original;
  };

  /**
   * A service worker whose only job is the page you get with no network. That
   * page leaves a mark in localStorage; the next page with a network claims it.
   */
  const watchForOffline = () => {
    try {
      if (localStorage.getItem(OFFLINE_MARK)) {
        localStorage.removeItem(OFFLINE_MARK);
        void claim("offline");
      }
    } catch {
      /* storage blocked */
    }
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
  };

  let clock: ReturnType<typeof setInterval> | undefined;
  const checkClock = () => {
    if (!isPiOClock()) return;
    clearInterval(clock);
    void claim("pi");
  };

  onMount(() => {
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-accent-500")
      .trim();
    console.log(`%c${GREETING}`, `color:${accent || "#10b981"};font-family:monospace`);
    fileRecords();
    watchForOffline();
    checkClock();
    clock = setInterval(checkClock, 20_000);
    window.addEventListener("keydown", handleKey);
    document.addEventListener("visibilitychange", handleVisibility);
  });

  onCleanup(() => {
    clearInterval(nag);
    clearInterval(clock);
    if (typeof window === "undefined") return;
    window.removeEventListener("keydown", handleKey);
    document.removeEventListener("visibilitychange", handleVisibility);
  });

  return (
    <Show when={retro()}>
      <div class="retro-overlay" aria-hidden="true" />
    </Show>
  );
}
