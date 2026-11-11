import { createFileRoute } from "@tanstack/solid-router";
import { Radio as RadioIcon } from "lucide-solid";

import { Room } from "~/components/Room";
import { getRadio } from "~/lib/api";
import { NO_INDEX } from "~/lib/seo";

export const Route = createFileRoute("/radio")({
  loader: () => getRadio(),
  head: () => ({ meta: [{ title: "Number station — Pocket CTF" }, NO_INDEX] }),
  component: Radio,
});

function Radio() {
  const station = Route.useLoaderData();

  return (
    <Room label="Shortwave · still transmitting" title="Number station">
      <p class="prose-mini">
        The same {station().bytes} bytes, over and over, for as long as anyone has been
        listening. It is a stream cipher, and a small one: a {station().width}-bit Galois
        linear-feedback shift register produces a keystream one bit at a time, and that
        keystream is XORed over the message.
      </p>

      <div class="flex items-start gap-3">
        <RadioIcon
          aria-hidden="true"
          size={18}
          class="mt-4 shrink-0 animate-pulse text-accent-600 dark:text-accent-400"
        />
        <div class="blob flex-1">{station().ciphertextHex}</div>
      </div>

      <div class="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          What the logbook says
        </p>
        <ul class="prose-mini list-disc space-y-1 pt-2 pl-5">
          <li>
            Register width: <code>{station().width}</code> bits.
          </li>
          <li>
            Feedback polynomial: <code>{station().taps}</code>. On each step the low bit is
            shifted out; if it was set, the register is XORed with that mask.
          </li>
          <li>Keystream bits are taken most-significant-bit first into each byte.</li>
          <li>The initial state was never written down. It is not zero.</li>
        </ul>
      </div>

      <p class="prose-mini">
        So one value is missing, and it is {station().width} bits wide. You can walk that whole
        space faster than you can read this paragraph. The only question is how you will know
        the right answer when you pass it, and you already know how every flag on this site
        begins.
      </p>
    </Room>
  );
}
