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
 * storage without mentioning it, and listens for one very old cheat code.
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

  onMount(() => {
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-accent-500")
      .trim();
    console.log(`%c${GREETING}`, `color:${accent || "#10b981"};font-family:monospace`);
    fileRecords();
    window.addEventListener("keydown", handleKey);
  });

  onCleanup(() => {
    if (typeof window !== "undefined") window.removeEventListener("keydown", handleKey);
  });

  return (
    <Show when={retro()}>
      <div class="retro-overlay" aria-hidden="true" />
    </Show>
  );
}
