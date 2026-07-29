import { createFileRoute } from "@tanstack/solid-router";
import { ChallengeShell } from "~/components/ChallengeShell";
import { getChallenge } from "~/lib/challenges";
import payloads from "~/lib/generated/payloads.json";

export const Route = createFileRoute("/c/chromatic-aberration")({
  component: ChromaticAberration,
  head: () => ({ meta: [{ title: "Chromatic Aberration — Pocket CTF" }] }),
});

const challenge = getChallenge("chromatic-aberration");
const { dataUri, size, bytes } = payloads["chromatic-aberration"];

function ChromaticAberration() {
  return (
    <ChallengeShell challenge={challenge}>
      <div class="space-y-5">
        <p class="prose-mini">
          A {size}×{size} PNG, {(bytes / 1024).toFixed(1)} KB, embedded in the page as a data
          URI. It is noise. Staring at it harder will not help, and neither will any filter you
          can apply by eye — the difference you are looking for is one part in 255.
        </p>

        <figure class="space-y-3">
          <div class="flex flex-wrap items-start gap-5">
            <img
              src={dataUri}
              alt={`${size} by ${size} pixels of colour noise`}
              width={size}
              height={size}
              class="rounded-lg border border-zinc-200 dark:border-zinc-800"
              style={{
                "image-rendering": "pixelated",
                width: `${size * 3}px`,
                height: `${size * 3}px`,
              }}
            />
            <figcaption class="prose-mini min-w-48 flex-1">
              Right-click → Save image, or work with it in place. Every pixel is three bytes;
              every byte has eight bits; and the bit at the bottom of a byte changes the colour
              by an amount your monitor cannot show you and your eye would not catch if it
              could.
            </figcaption>
          </div>
        </figure>

        <p class="prose-mini">
          You do not need a stego tool. A canvas and <code>getImageData</code> will hand you the
          raw bytes in four lines, and the browser you are reading this in has both.
        </p>

        <details class="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <summary class="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
            How to get pixel bytes out of an image
          </summary>
          <div class="prose-mini pt-3">
            <p>
              Draw it to an offscreen <code>&lt;canvas&gt;</code> and read it back. The returned
              array is <code>[r, g, b, a, r, g, b, a, …]</code> in row-major order — four bytes
              per pixel, left to right, top to bottom.
            </p>
            <pre>
              <code>{`const img = document.querySelector('img');
const c = Object.assign(document.createElement('canvas'),
  { width: img.naturalWidth, height: img.naturalHeight });
const ctx = c.getContext('2d');
ctx.drawImage(img, 0, 0);
const { data } = ctx.getImageData(0, 0, c.width, c.height);
// data[0]=R  data[1]=G  data[2]=B  data[3]=A  of pixel 0`}</code>
            </pre>
            <p>Which channel, and which bit, is the part left to you.</p>
          </div>
        </details>
      </div>
    </ChallengeShell>
  );
}
