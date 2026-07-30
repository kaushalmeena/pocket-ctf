import { useProgress } from "~/lib/store";
import { meta } from "./meta";

// biome-ignore lint/suspicious/noExplicitAny: the payload shape is this
// challenge's own business, and pinning it here would couple every challenge
// to one shared union.
type Payload = any;

export default function Page(props: { payload: Payload }) {
  const { poem, carrierLength } = props.payload;
  const { noteEngagement } = useProgress();

  return (
    <div class="space-y-5">
      <p class="prose-mini">
        Below is a poem about not much. It is {carrierLength} characters long, or at least that
        is how many you can see.
      </p>

      {/*
        `poem` is the generated carrier: the visible text with U+200B / U+200C
        interleaved as zero and one. Rendered as a JSX text node so the exact
        code points survive to the DOM and to the clipboard.
      */}
      <blockquote
        onCopy={() => noteEngagement(meta.slug, "copied-carrier")}
        class="carrier rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
      >
        {poem}
      </blockquote>

      <p class="prose-mini">
        Select it. Copy it. Paste it into anything that will tell you how many characters you
        pasted. The number will not match the number above, and the difference is the message.
      </p>

      <details class="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <summary class="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Why would anyone do this on purpose?
        </summary>
        <div class="prose-mini pt-3">
          <p>
            Because it survives everything text normally survives. Copy-paste, email, chat, a
            pull request description. Publishers have used zero-width sequences to fingerprint
            review copies; leakers have been identified by the invisible serial number in a
            document they forwarded.
          </p>
          <p>
            The characters are real Unicode with real jobs — <code>U+200B</code> is a zero-width
            space, <code>U+200C</code> a zero-width non-joiner. Nothing about them is a hack.
            They just happen to be a two-symbol alphabet that renders as nothing at all.
          </p>
        </div>
      </details>
    </div>
  );
}
