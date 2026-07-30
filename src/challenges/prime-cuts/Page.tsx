import { Check, Copy } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { useProgress } from "~/lib/store";
import { meta } from "./meta";

// biome-ignore lint/suspicious/noExplicitAny: the payload shape is this
// challenge's own business, and pinning it here would couple every challenge
// to one shared union.
type Payload = any;

export default function Page(props: { payload: Payload }) {
  const { n, factorCount } = props.payload;
  const { noteEngagement } = useProgress();
  const [copied, setCopied] = createSignal(false);

  const copy = async () => {
    await navigator.clipboard.writeText(n);
    noteEngagement(meta.slug, "copied-composite");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div class="space-y-5">
      <p class="prose-mini">
        Here is a {n.length}-digit integer. It is squarefree — no prime divides it twice — and
        it has {factorCount} prime factors, none of them large. That is everything you are told
        about how it was built.
      </p>

      <div class="space-y-2">
        <div class="blob leading-6">{n}</div>
        <button
          type="button"
          onClick={copy}
          class="inline-flex min-w-40 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <Show when={copied()} fallback={<Copy aria-hidden="true" size={12} />}>
            <Check aria-hidden="true" size={12} class="text-accent-600 dark:text-accent-400" />
          </Show>
          {copied() ? "Copied" : "Copy the number"}
        </button>
      </div>

      <p class="prose-mini">
        A number this size sounds intimidating and is not. The factors are small enough that
        dividing by every integer in turn finishes instantly — you will want <code>BigInt</code>
        , because ordinary JavaScript numbers stop being exact at sixteen digits and will lie to
        you without complaint.
      </p>

      <div class="rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          The question worth asking
        </p>
        <p class="prose-mini pt-1.5">
          Every whole number has exactly one prime factorisation. Not one that is easiest to
          find — <em>one that exists</em>. So a list of primes is a list that cannot be
          reordered, cannot be padded, and cannot be forged. What would you use a tamper-proof
          ordered list of small numbers for, if you wanted to store text in it?
        </p>
      </div>

      <p class="prose-mini">
        Factor it, sort what falls out, and then do the obvious thing to turn small numbers into
        characters. There is one arithmetic detail you will have to notice on your own, and you
        will notice it because your first guess produces nonsense for about half the alphabet.
      </p>

      <details class="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <summary class="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Trial division, if it has been a while
        </summary>
        <div class="prose-mini pt-3">
          <pre>
            <code>{`let n = BigInt("…"), out = [];
    for (let p = 2n; p * p <= n; p++)
      while (n % p === 0n) { out.push(p); n /= p; }
    if (n > 1n) out.push(n);   // whatever is left is prime`}</code>
          </pre>
          <p>
            That loop is already in ascending order, which saves you a sort and is not an
            accident of how the puzzle was built.
          </p>
        </div>
      </details>
    </div>
  );
}
