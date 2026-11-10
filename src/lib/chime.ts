import type { TrophyTier } from "./types";

/**
 * The sound a trophy makes: two or three sine notes with a soft tail,
 * synthesised on the spot so there is no audio file to ship.
 *
 * Rarer trophies climb higher and ring longer. Failure is silent by design --
 * a browser that refuses audio should not cost anyone their toast.
 */
const NOTES: Record<TrophyTier, number[]> = {
  secret: [523.25, 783.99],
  bronze: [587.33, 880],
  silver: [659.25, 987.77],
  gold: [659.25, 987.77, 1318.51],
  platinum: [523.25, 659.25, 783.99, 1046.5, 1318.51],
};

let shared: AudioContext | undefined;

export function chime(tier: TrophyTier) {
  try {
    shared ??= new AudioContext();
    const audio = shared;
    if (audio.state === "suspended") void audio.resume();
    const start = audio.currentTime + 0.02;

    NOTES[tier].forEach((hz, i) => {
      const at = start + i * 0.09;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.12, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
      osc.connect(gain).connect(audio.destination);
      osc.start(at);
      osc.stop(at + 1);
    });
  } catch {
    /* no audio, no problem */
  }
}
