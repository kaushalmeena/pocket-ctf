import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import sampleKey from "../../flags.sample.json";

/**
 * The answer key, read when the server starts.
 *
 * Production reads it from `POCKET_CTF_FLAGS` (the whole of flags.secret.json,
 * as one line of JSON); a laptop reads flags.secret.json itself. With neither,
 * the server runs on the public demo key and every page says so.
 *
 * Nothing is generated from it ahead of time. Flags, puzzles, clues and
 * writeups are all worked out from this object on request, so changing a hint
 * is an env change and a restart, not a rebuild.
 */

export type AnswerKey = {
  /** Base flag per challenge: `pctf{a_memorable_phrase}`. */
  flags: Record<string, string>;
  /** Clues sold after the first ("where to look"), most general first. */
  hints?: Record<string, string[]>;
  /** How it worked, released once the flag is held. Markdown. */
  writeups?: Record<string, string>;
  /** Decoy flag -> what to say to whoever submits it. */
  honeypots?: Record<string, string>;
};

export const KEY_ENV = "POCKET_CTF_FLAGS";
const KEY_FILE = "flags.secret.json";

function load(): { key: AnswerKey; sample: boolean } {
  const fromEnv = process.env[KEY_ENV];
  if (fromEnv) return { key: JSON.parse(fromEnv), sample: false };
  const file = join(process.cwd(), KEY_FILE);
  if (existsSync(file)) return { key: JSON.parse(readFileSync(file, "utf8")), sample: false };
  return { key: sampleKey as AnswerKey, sample: true };
}

const loaded = load();

export const KEY: AnswerKey = loaded.key;

/** Running on the public demo key: every flag phrase is in the repository. */
export const IS_SAMPLE = loaded.sample;
