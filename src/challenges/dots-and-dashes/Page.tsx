import { Play, Square } from "lucide-solid";
import { createSignal, onCleanup, Show } from "solid-js";
import { useProgress } from "~/lib/store";
import { meta } from "./meta";

/**
 * This challenge's own payload shape. Deliberately loose: pinning it here would
 * couple every challenge to one shared union, which is the coupling the
 * one-directory-per-challenge layout exists to remove.
 */
// biome-ignore lint/suspicious/noExplicitAny: payload shape is per-challenge
type Payload = any;

export default function Page(props: { payload: Payload }) {
  const { timeline, unitMs, toneHz } = props.payload;
  const totalMs = timeline.reduce((sum: number, step: { ms: number }) => sum + step.ms, 0);
  const { noteEngagement } = useProgress();
  const [playing, setPlaying] = createSignal(false);
  const [rate, setRate] = createSignal(1);
  const [elapsed, setElapsed] = createSignal(0);

  let ctx: AudioContext | undefined;
  let stopAt = 0;
  let raf = 0;

  const stop = () => {
    ctx?.close();
    ctx = undefined;
    // Prerendering disposes this component on the server, where neither the
    // audio context nor the frame scheduler exists.
    if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
    setPlaying(false);
    setElapsed(0);
  };

  onCleanup(stop);

  /**
   * Schedules the whole message up front against the audio clock rather than
   * driving it from timers -- setTimeout drift would smear the difference
   * between a one-unit dot and a three-unit dash, which is the entire signal.
   */
  const play = () => {
    stop();
    noteEngagement(meta.slug, "played-audio");
    const audio = new AudioContext();
    ctx = audio;
    const speed = rate();
    let at = audio.currentTime + 0.15;

    for (const step of timeline) {
      const seconds = step.ms / 1000 / speed;
      if (step.on) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "sine";
        osc.frequency.value = toneHz;
        // Short ramps instead of hard gates: a square-edged gain envelope
        // clicks, and the clicks are louder than the tone.
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.22, at + 0.008);
        gain.gain.setValueAtTime(0.22, at + seconds - 0.008);
        gain.gain.linearRampToValueAtTime(0, at + seconds);
        osc.connect(gain).connect(audio.destination);
        osc.start(at);
        osc.stop(at + seconds);
      }
      at += seconds;
    }

    stopAt = at;
    setPlaying(true);

    const tick = () => {
      if (!ctx) return;
      const remaining = stopAt - ctx.currentTime;
      setElapsed(Math.min(1, 1 - remaining / (totalMs / 1000 / speed)));
      if (remaining <= 0) stop();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };

  return (
    <div class="space-y-5">
      <p class="prose-mini">
        Turn your volume up a little. This is {(totalMs / 1000).toFixed(1)} seconds of a single{" "}
        {toneHz} Hz tone being switched on and off. The information is entirely in the durations
        — how long each beep lasts, and how long each silence lasts.
      </p>

      <div class="space-y-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => (playing() ? stop() : play())}
            class="flex min-w-24 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <Show
              when={playing()}
              fallback={<Play aria-hidden="true" size={14} fill="currentColor" />}
            >
              <Square aria-hidden="true" size={14} fill="currentColor" />
            </Show>
            {playing() ? "Stop" : "Play"}
          </button>

          <label class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            Speed
            <select
              value={rate()}
              onChange={(e) => setRate(Number(e.currentTarget.value))}
              class="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
            </select>
          </label>

          <span class="ml-auto font-mono text-xs text-zinc-400 dark:text-zinc-600">
            base unit {unitMs} ms
          </span>
        </div>

        <div class="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            class="h-full bg-accent-500"
            style={{ width: `${Math.round(elapsed() * 100)}%` }}
          />
        </div>

        {/* Always visible. Hiding it the moment you pressed play removed the
            advice exactly when it became relevant. */}
        <p class="text-xs text-zinc-400 dark:text-zinc-600">
          Slow it down if the long and short beeps blur together. Nobody decodes this at full
          speed on the first pass.
        </p>
      </div>

      <p class="prose-mini">
        Three silences, three meanings: a short gap separates the parts of one letter, a medium
        gap ends a letter, and a long gap ends a word. The word gap becomes an underscore when
        you write the flag.
      </p>

      <details class="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <summary class="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
          I would rather read than listen
        </summary>
        <div class="prose-mini pt-3">
          <p>
            Fair. The schedule is shipped with the page as a list of{" "}
            <code>&#123; on, ms &#125;</code> steps, and dividing each duration by the base unit
            gives you the count in units. That is not cheating — it is the same information your
            ears would have got, with the transcription done for you.
          </p>
          <p>
            What it will not do is tell you the alphabet. You still have to know, or look up,
            which pattern of long and short means which letter.
          </p>
        </div>
      </details>
    </div>
  );
}
