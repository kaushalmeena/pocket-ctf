import { createMemo, createSignal, For } from "solid-js";
import { useProgress } from "~/lib/store";
import { meta } from "./meta";

// biome-ignore lint/suspicious/noExplicitAny: the payload shape is this
// challenge's own business, and pinning it here would couple every challenge
// to one shared union.
type Payload = any;

export default function Page(props: { payload: Payload }) {
  const { ciphertextHex, keyLength, bytes } = props.payload;
  const { noteEngagement } = useProgress();
  const [column, setColumn] = createSignal(0);

  /**
   * A column viewer, not a solver. Splitting the ciphertext by key length is
   * the insight the challenge is about, so making it tangible is fair -- but
   * every byte shown is still ciphertext, and the actual work is untouched.
   */
  const columnBytes = createMemo(() => {
    const all = ciphertextHex.match(/.{2}/g) ?? [];
    return all.filter((_: string, i: number) => i % keyLength === column());
  });

  return (
    <div class="space-y-5">
      <p class="prose-mini">
        A paragraph of ordinary English, {bytes} bytes long, XORed byte-for-byte with a key that
        is <strong>{keyLength} bytes</strong> long and repeats. The key is the inner text of the
        flag: recover it, wrap it in <code class="whitespace-nowrap">pctf&#123; &#125;</code>,
        and you are done.
      </p>

      <div class="blob max-h-56 overflow-y-auto">{ciphertextHex}</div>

      <p class="prose-mini">
        You are not told the plaintext, so you cannot simply XOR your way in. What you are told
        is the key length, and that turns out to be almost everything, because a repeating key
        does not encrypt one message — it encrypts {keyLength} interleaved messages, each with a
        single-byte key.
      </p>

      <section class="space-y-3 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Column view</h2>
          <p class="text-xs text-zinc-500 dark:text-zinc-500">
            every byte here was XORed with the same single byte of the key
          </p>
        </div>

        <div class="flex flex-wrap gap-1">
          <For each={Array.from({ length: keyLength }, (_, i) => i)}>
            {(i) => (
              <button
                type="button"
                onClick={() => {
                  setColumn(i);
                  noteEngagement(meta.slug, "inspected-column");
                }}
                aria-pressed={column() === i}
                class="size-7 rounded-md font-mono text-xs transition-colors aria-pressed:bg-zinc-900 aria-pressed:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:aria-pressed:bg-zinc-100 dark:aria-pressed:text-zinc-900"
              >
                {i}
              </button>
            )}
          </For>
        </div>

        <p class="blob mb-0">{columnBytes().join(" ")}</p>

        <p class="text-xs text-zinc-500 dark:text-zinc-500">
          Column {column()}: {columnBytes().length} bytes, positions {column()},{" "}
          {column() + keyLength}, {column() + keyLength * 2}, and so on. One unknown byte stands
          between this and readable text.
        </p>
      </section>

      <div class="rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          How to guess a single byte well
        </p>
        <p class="prose-mini pt-1.5">
          Try all 256 of them. For each candidate, XOR the whole column and ask how much the
          result looks like English — spaces are the most common character in prose by a wide
          margin, then <code>e t a o i n</code>. Score it, keep the winner, move to the next
          column. {keyLength} small brute-forces, none of which can fail.
        </p>
      </div>

      <p class="prose-mini">
        This is not a toy weakness. Repeating-key XOR shipped in real products for decades, and
        the attack above is why "we encrypt it with a secret key" and "it is secure" are
        different claims.
      </p>
    </div>
  );
}
