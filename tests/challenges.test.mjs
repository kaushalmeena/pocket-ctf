import { describe, expect, it } from "vitest";
import { slugs, solverFor } from "../scripts/lib/discover.mjs";
import { normalizeFlag } from "../src/lib/kdf.js";
import { flags, payloads, registry } from "./helpers.mjs";

/**
 * The check that matters. It does not assert that the code runs -- it plays the
 * game, driving each challenge's own reference solver against the payload that
 * actually shipped. A puzzle that cannot be solved from what a player receives
 * fails here rather than in someone's evening.
 */
describe("every challenge is solvable from shipped data", () => {
  const discovered = slugs();

  it("discovers at least one challenge", () => {
    expect(discovered.length).toBeGreaterThan(0);
  });

  it("has generated data for every discovered challenge, and no orphans", () => {
    expect([...registry.order].sort()).toEqual([...discovered].sort());
  });

  for (const slug of discovered) {
    it(`${slug} solves to its flag`, async () => {
      const { solve } = await solverFor(slug);
      const recovered = await solve({ payload: payloads[slug] });
      expect(recovered).toBe(normalizeFlag(flags[slug]));
    });
  }
});

describe("payload hygiene", () => {
  for (const slug of slugs()) {
    it(`${slug} does not ship its flag in plaintext`, () => {
      const serialized = JSON.stringify(payloads[slug]);
      expect(serialized).not.toContain(normalizeFlag(flags[slug]));
    });
  }
});
