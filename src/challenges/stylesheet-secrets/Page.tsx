type Payload = { stylesheet: string; ruleCount: number };

export default function Page(props: { payload: Payload }) {
  return (
    <div class="space-y-5">
      <p class="prose-mini">
        A stylesheet of {props.payload.ruleCount} rules, and nothing else. It is never applied
        to anything — there are no elements on this page carrying those classes, so the browser
        will not draw it for you. Read it yourself.
      </p>

      <pre class="blob max-h-80 overflow-y-auto whitespace-pre">{props.payload.stylesheet}</pre>

      <p class="prose-mini">
        Every rule carries one character and one number. The characters are not written as
        characters, and the rules are not written in order — but CSS has an established way of
        saying "this comes before that" regardless of how the source is arranged, and that is
        the number sitting right beside each one.
      </p>

      <details class="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <summary class="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
          What is that backslash doing there?
        </summary>
        <div class="prose-mini pt-3">
          <p>
            CSS strings can hold a character by its code point rather than the character itself,
            written as a backslash followed by up to six hexadecimal digits. It is how you put a
            glyph in a stylesheet without worrying about file encodings.
          </p>
          <p>
            So <code>"\0070"</code> is not four characters. It is one, and <code>0x70</code> is
            its code point.
          </p>
        </div>
      </details>
    </div>
  );
}
