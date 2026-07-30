/**
 * Filesystem discovery of challenge modules, for the build-time tools.
 *
 * The browser finds challenges with `import.meta.glob`; Node cannot, so this is
 * the equivalent. Both read the same directories, so a challenge that exists for
 * one exists for the other -- there is no manifest to fall out of sync.
 */

import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CHALLENGES_DIR = join(ROOT, "src", "challenges");

/** Slugs, in directory order (sorted, so output is stable across machines). */
export function slugs() {
  return readdirSync(CHALLENGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(CHALLENGES_DIR, e.name, "build.mjs")))
    .map((e) => e.name)
    .sort();
}

const load = async (slug, file) => import(pathToFileURL(join(CHALLENGES_DIR, slug, file)).href);

/** `build({ flag, seal })` -> the payload committed for that challenge. */
export const builderFor = (slug) => load(slug, "build.mjs");

/** `solve({ payload, unseal })` -> the flag, from shipped data only. */
export const solverFor = (slug) => load(slug, "solve.mjs");
