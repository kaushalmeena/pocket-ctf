import { createSignal, onMount, Show } from "solid-js";
import { useProgress } from "~/lib/store";
import { meta } from "./meta";

type Payload = {
  records: { seq: number; data: string }[];
  dbName: string;
  store: string;
};

export default function Page(props: { payload: Payload }) {
  const { noteEngagement } = useProgress();
  const [written, setWritten] = createSignal<number | null>(null);
  const [failed, setFailed] = createSignal(false);

  /**
   * Seed the records into IndexedDB and render nothing about them.
   *
   * The page genuinely does not display the data. Everything needed is sitting
   * in browser storage, which is a place most people never think to open and
   * which real forensics looks at first.
   */
  onMount(() => {
    const request = indexedDB.open(props.payload.dbName, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(props.payload.store)) {
        db.createObjectStore(props.payload.store, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onerror = () => setFailed(true);

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(props.payload.store, "readwrite");
      const store = tx.objectStore(props.payload.store);
      store.clear();
      for (const record of props.payload.records) store.add(record);
      tx.oncomplete = () => {
        setWritten(props.payload.records.length);
        noteEngagement(meta.slug, "seeded-storage");
        db.close();
      };
      tx.onerror = () => setFailed(true);
    };
  });

  return (
    <div class="space-y-5">
      <p class="prose-mini">
        This page stores something and then declines to show it to you. That is the whole
        design: the data went into the browser, and the browser will hand it back to anyone who
        thinks to ask.
      </p>

      <div class="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <p class="text-xs tracking-wider text-zinc-400 uppercase dark:text-zinc-600">Status</p>
        <Show
          when={written()}
          fallback={
            <p class="pt-2 font-mono text-sm text-zinc-500">
              {failed() ? "Storage unavailable in this browser." : "Writing…"}
            </p>
          }
        >
          {(count) => (
            <p class="pt-2 font-mono text-sm text-zinc-900 dark:text-zinc-100">
              {count()} records committed. Nothing further will be shown here.
            </p>
          )}
        </Show>
      </div>

      <p class="prose-mini">
        Each record holds a fragment and the position that fragment belongs at. The fragments
        went in out of order, so reading them back in whatever sequence the store returns will
        get you a jumble. They are also not stored as text — three characters at a time, in the
        encoding you would reach for if you had to put arbitrary bytes into JSON.
      </p>

      <details class="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <summary class="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Where does a browser keep things?
        </summary>
        <div class="prose-mini pt-3">
          <p>
            Devtools has a whole panel for it — Application in Chromium, Storage in Firefox.
            Cookies, Local Storage, Session Storage, Cache Storage and IndexedDB all live there,
            and all of them are readable and editable by you.
          </p>
          <p>
            You can also ask from the Console. The API is old and callback-shaped, but{" "}
            <code>indexedDB.open</code>, a <code>transaction</code>, and <code>getAll()</code>{" "}
            is the whole of it.
          </p>
        </div>
      </details>
    </div>
  );
}
