import { describe, expect, it } from "vitest";
import { slugs, solverFor } from "../scripts/lib/discover.mjs";
import { normalizeFlag } from "../src/lib/kdf.js";
import { flags, payloads, registry, variantCount } from "./helpers.mjs";

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
    it(`${slug} solves to its flag, in all ${variantCount} variants`, async () => {
      const { solve } = await solverFor(slug);
      for (const [variant, payload] of payloads[slug].variants.entries()) {
        const recovered = await solve({ payload });
        expect(recovered, `${slug} variant ${variant}`).toBe(
          normalizeFlag(flags[slug][variant]),
        );
      }
    });
  }

  it("gives every variant a different flag", () => {
    for (const slug of discovered) {
      const distinct = new Set(flags[slug]);
      expect(distinct.size, `${slug} reused a flag across variants`).toBe(variantCount);
    }
  });

  it("gives every variant different puzzle data", () => {
    for (const slug of discovered) {
      const serialised = payloads[slug].variants.map((v) => JSON.stringify(v));
      expect(new Set(serialised).size, `${slug} shipped identical variants`).toBe(variantCount);
    }
  });
});

describe("payload hygiene", () => {
  for (const slug of slugs()) {
    it(`${slug} ships no variant's flag in plaintext`, () => {
      const serialized = JSON.stringify(payloads[slug]);
      for (const flag of flags[slug]) {
        expect(serialized).not.toContain(normalizeFlag(flag));
      }
    });
  }
});
