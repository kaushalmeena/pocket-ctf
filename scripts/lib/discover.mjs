/**
 * Filesystem discovery of challenge modules, for the tests and tools.
 *
 * The server finds challenges with `import.meta.glob`; plain Node cannot, so
 * this is the equivalent. Both read the same directories, so a challenge that exists for
 * one exists for the other -- there is no manifest to fall out of sync.
 */

import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CHALLENGES_DIR = join(ROOT, "src", "challenges");

/** Every challenge, sorted so output is stable across machines. */
export function slugs() {
  return readdirSync(CHALLENGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(CHALLENGES_DIR, e.name, "meta.ts")))
    .map((e) => e.name)
    .sort();
}

/**
 * The challenges that hide their flag in a puzzle. The rest have no build.mjs:
 * the server hands their flag over once a request earns it.
 */
export const puzzleSlugs = () =>
  slugs().filter((slug) => existsSync(join(CHALLENGES_DIR, slug, "build.mjs")));

const load = async (slug, file) => import(pathToFileURL(join(CHALLENGES_DIR, slug, file)).href);

/** `build({ flag, slug })` -> the puzzle that hides that flag. */
export const builderFor = (slug) => load(slug, "build.mjs");

/** `solve({ payload })` -> the flag, from what the player was sent. */
export const solverFor = (slug) => load(slug, "solve.mjs");
