import { For, type JSX, Show } from "solid-js";

/**
 * A deliberately tiny Markdown subset: fenced code, paragraphs, inline `code`
 * and **bold**.
 *
 * Writeups are decrypted at runtime, so they arrive as a string rather than as
 * a compiled template. Rendering them through JSX text nodes rather than
 * `innerHTML` means the escaping is Solid's problem, not mine -- worth the
 * hundred lines given this content is AES-GCM output.
 */

type Block = { kind: "code"; text: string } | { kind: "p"; text: string };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const fenced = source.split(/```(?:[a-z]*)\n?/);

  fenced.forEach((chunk, i) => {
    // Odd indices sit between fences, so they are code.
    if (i % 2 === 1) {
      blocks.push({ kind: "code", text: chunk.replace(/\n$/, "") });
      return;
    }
    for (const para of chunk.split(/\n{2,}/)) {
      const text = para.trim();
      if (text) blocks.push({ kind: "p", text });
    }
  });

  return blocks;
}

/** Splits a paragraph into plain text, `code` and **bold** runs. */
function inline(text: string): JSX.Element[] {
  const out: JSX.Element[] = [];
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let cursor = 0;
  let match = pattern.exec(text);

  while (match) {
    if (match.index > cursor) out.push(text.slice(cursor, match.index));
    if (match[1] !== undefined) {
      out.push(
        <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] text-accent-600 dark:bg-zinc-800 dark:text-accent-400">
          {match[1]}
        </code>,
      );
    } else if (match[2] !== undefined) {
      out.push(
        <strong class="font-semibold text-zinc-800 dark:text-zinc-200">{match[2]}</strong>,
      );
    }
    cursor = match.index + match[0].length;
    match = pattern.exec(text);
  }

  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

export function Markdown(props: { source: string }) {
  const blocks = () => parse(props.source);

  return (
    <div class="space-y-3">
      <For each={blocks()}>
        {(block) => (
          <Show
            when={block.kind === "code"}
            fallback={<p class="prose-mini">{inline(block.text)}</p>}
          >
            <pre class="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100 dark:bg-black">
              <code>{block.text}</code>
            </pre>
          </Show>
        )}
      </For>
    </div>
  );
}
