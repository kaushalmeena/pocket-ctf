/**
 * Shared test fixtures.
 *
 * Tests run against whatever challenge data is *live* -- the real set when an
 * answer key is present, the committed demo set on a fresh clone or in CI. The
 * registry says which, so the matching key is loaded either way and the suite
 * passes in both situations without being told.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDeployment, readKey, readSampleKey, resolveFlags } from "../scripts/answers.mjs";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

export const registry = read("src/lib/generated/registry.json");
export const payloads = read("src/lib/generated/payloads.json");
export const isSample = registry.sample === true;

const key = isSample ? readSampleKey(ROOT) : readKey(ROOT);

const suffixes = isSample
  ? Object.fromEntries(registry.order.map((s) => [s, "sample"]))
  : (readDeployment(ROOT)?.suffixes ?? {});

/** `{ slug: resolvedFlag }` for this deployment. */
export const flags = resolveFlags(key, suffixes);
export const answerKey = key;
