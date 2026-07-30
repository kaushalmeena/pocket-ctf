type Payload = { ciphertextHex: string; width: number; taps: string; bytes: number };

export default function Page(props: { payload: Payload }) {
  return (
    <div class="space-y-5">
      <p class="prose-mini">
        A stream cipher, and a small one. A {props.payload.width}-bit Galois linear-feedback
        shift register produces a keystream one bit at a time, that keystream is XORed over the
        flag, and the result is below — {props.payload.bytes} bytes of it.
      </p>

      <div class="blob">{props.payload.ciphertextHex}</div>

      <div class="rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">What you are told</p>
        <ul class="prose-mini list-disc space-y-1 pt-2 pl-5">
          <li>
            Register width: <code>{props.payload.width}</code> bits.
          </li>
          <li>
            Feedback polynomial: <code>{props.payload.taps}</code>. On each step the low bit is
            shifted out; if it was set, the register is XORed with that mask.
          </li>
          <li>Keystream bits are taken most-significant-bit first into each byte.</li>
          <li>The initial state is not given, and is never zero.</li>
        </ul>
      </div>

      <p class="prose-mini">
        So one value is missing, and it is {props.payload.width} bits wide. That is a search
        space you can walk end to end faster than you can read this paragraph — the only
        question is how you recognise the right answer when you reach it, and you already know
        the first five characters of every flag on this site.
      </p>

      <details class="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <summary class="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Why is a short register fatal?
        </summary>
        <div class="prose-mini pt-3">
          <p>
            An LFSR is entirely determined by its width, its polynomial and its state. Nothing
            else feeds in — no key schedule, no message dependence — so recovering the state
            recovers every bit it will ever produce, forwards and backwards.
          </p>
          <p>
            Real designs use registers hundreds of bits wide and combine several of them
            non-linearly, precisely because the linear part is this easy to unwind.
          </p>
        </div>
      </details>
    </div>
  );
}
