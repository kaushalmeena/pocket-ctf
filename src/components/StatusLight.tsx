import { createSignal, onCleanup, onMount } from "solid-js";

type Step = { on: boolean; ms: number };

/** Silence between repeats, long enough to read as "and again". */
const REST_MS = 3200;
const TONE_HZ = 620;

/**
 * The light in the footer.
 *
 * It keeps time to whatever `/api/pulse` sends, on a loop, for as long as the
 * page is open. Clicking it plays the same rhythm as a tone, for anyone who
 * would rather listen than watch.
 */
export function StatusLight() {
  const [lit, setLit] = createSignal(false);
  const [label, setLabel] = createSignal("online");
  let steps: Step[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let audio: AudioContext | undefined;

  const run = (index: number) => {
    const step = steps[index];
    if (!step) {
      setLit(false);
      timer = setTimeout(() => run(0), REST_MS);
      return;
    }
    setLit(step.on);
    timer = setTimeout(() => run(index + 1), step.ms);
  };

  onMount(async () => {
    // Asked on every page. The answer is always the same, to a browser.
    fetch("/api/status")
      .then((response) => response.json())
      .then((body) => typeof body?.status === "string" && setLabel(body.status))
      .catch(() => setLabel("unreachable"));

    try {
      const response = await fetch("/api/pulse");
      steps = (await response.json()).timeline ?? [];
      if (steps.length > 0) run(0);
    } catch {
      /* no pulse; the light stays dark */
    }
  });

  onCleanup(() => {
    clearTimeout(timer);
    void audio?.close();
  });

  const handlePlay = () => {
    if (steps.length === 0) return;
    try {
      void audio?.close();
      audio = new AudioContext();
      const gain = audio.createGain();
      const osc = audio.createOscillator();
      osc.frequency.value = TONE_HZ;
      gain.gain.value = 0;
      osc.connect(gain).connect(audio.destination);

      let at = audio.currentTime + 0.05;
      for (const step of steps) {
        gain.gain.setValueAtTime(step.on ? 0.08 : 0, at);
        at += step.ms / 1000;
      }
      gain.gain.setValueAtTime(0, at);
      osc.start();
      osc.stop(at + 0.05);
    } catch {
      /* audio refused; the light still blinks */
    }
  };

  return (
    <button
      type="button"
      onClick={handlePlay}
      class="group inline-flex items-center gap-2 font-mono"
      aria-label="Status light"
      title="status"
    >
      <span class="status-light size-2 rounded-full" classList={{ "status-light-on": lit() }} />
      <span class="group-hover:text-zinc-900 dark:group-hover:text-zinc-100">{label()}</span>
    </button>
  );
}
