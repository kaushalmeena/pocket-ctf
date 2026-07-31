/**
 * This challenge's own payload shape. Deliberately loose: pinning it here would
 * couple every challenge to one shared union, which is the coupling the
 * one-directory-per-challenge layout exists to remove.
 */
// biome-ignore lint/suspicious/noExplicitAny: payload shape is per-challenge
type Payload = any;

export default function Page(props: { payload: Payload }) {
  const { blob, layers } = props.payload;

  return (
    <div class="space-y-5">
      <p class="prose-mini">
        {layers} transformations, applied one after another. Each is something you have seen
        before. Undo them in the right order and the flag falls out; undo them in the wrong
        order and you get nothing that looks like progress.
      </p>

      <div class="blob">{blob}</div>

      <p class="prose-mini">
        No key, no password, nothing secret — every layer here is an <em>encoding</em>, which
        means it is reversible by anyone who recognises it. The only skill on trial is
        recognition: knowing what an encoding looks like from the outside, before you have
        decoded any of it.
      </p>

      <details class="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <summary class="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
          A field guide to silhouettes
        </summary>
        <div class="prose-mini space-y-2 pt-3">
          <p>
            <strong>base64</strong> — mixed case, digits, <code>+</code> and <code>/</code>,
            length a multiple of four, sometimes padded with <code>=</code>. Expands data by a
            third.
          </p>
          <p>
            <strong>base32</strong> — uppercase letters and the digits 2 through 7 only. No 0,
            1, 8 or 9, because they look like O, I, B and g. Heavily padded.
          </p>
          <p>
            <strong>hex</strong> — only 0-9 and a-f, always an even length.
          </p>
          <p>
            <strong>ROT13</strong> — still looks like words. Still pronounceable. Just wrong. If
            a decoded layer reads like language but isn't, suspect a substitution cipher rather
            than another encoding.
          </p>
        </div>
      </details>
    </div>
  );
}
