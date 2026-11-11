/**
 * Shared test fixtures.
 *
 * Tests run against whichever answer key the server would use here: the real
 * one when flags.secret.json (or POCKET_CTF_FLAGS) is present, the committed
 * demo key on a fresh clone or in CI.
 */

import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { liveKey } from "../scripts/answers.mjs";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const live = liveKey(ROOT);

export const answerKey = live.key;
export const isSample = live.sample;

/** A few players' worth of seeds, shaped like the server's. */
export const seeds = Array.from({ length: 4 }, () => randomBytes(16).toString("hex"));
