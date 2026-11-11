import { createFileRoute } from "@tanstack/solid-router";

import { Room } from "~/components/Room";
import { getDeadDrop } from "~/lib/api";
import { NO_INDEX } from "~/lib/seo";

export const Route = createFileRoute("/dead-drop")({
  loader: () => getDeadDrop(),
  head: () => ({ meta: [{ title: "Dead drop — Pocket CTF" }, NO_INDEX] }),
  component: DeadDrop,
});

function DeadDrop() {
  const drop = Route.useLoaderData();

  return (
    <Room label="Security contact" title="Dead drop">
      <p class="prose-mini">
        Reports left here are encrypted before anyone reads them. One report has been sitting in
        the box for a while: {drop().bytes} bytes of ordinary English prose, XORed byte for byte
        with a key that is <strong>{drop().keyLength} bytes</strong> long and repeats.
      </p>

      <div class="blob max-h-64 overflow-y-auto">{drop().ciphertextHex}</div>

      <dl class="grid grid-cols-3 gap-3 font-mono text-xs">
        <Fact label="cipher">xor, repeating</Fact>
        <Fact label="key length">{drop().keyLength} bytes</Fact>
        <Fact label="message">{drop().bytes} bytes</Fact>
      </dl>

      <p class="prose-mini">
        Nobody kept the plaintext, so you cannot simply XOR your way in. What you have is the
        key length, and that turns out to be nearly everything: a repeating key does not encrypt
        one message, it encrypts {drop().keyLength} interleaved ones, each with a single byte.
        English is not random, and a single byte has only 256 values.
      </p>

      <p class="prose-mini">
        The key itself is what you came for. Recover it, wrap it in{" "}
        <code class="whitespace-nowrap">pctf&#123; &#125;</code>, and take it to the front page.
      </p>
    </Room>
  );
}

function Fact(props: { label: string; children: unknown }) {
  return (
    <div class="rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
      <dt class="text-[0.65rem] tracking-widest text-zinc-500 uppercase">{props.label}</dt>
      <dd class="pt-1 text-zinc-900 dark:text-zinc-100">{props.children as never}</dd>
    </div>
  );
}
