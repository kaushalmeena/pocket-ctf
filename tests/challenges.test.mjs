import { describe, expect, it } from "vitest";

import { builderFor, puzzleSlugs, slugs, solverFor } from "../scripts/lib/discover.mjs";
import { baseOf, normalizeFlag, personalFlag, suffixFor } from "../scripts/lib/flag.mjs";
import { answerKey, seeds } from "./helpers.mjs";

/**
 * The check that matters. Every player is dealt their own flag, so every
 * puzzle is built on the server from whatever flag that player holds. For
 * several players' flags, each puzzle is built, then solved with the
 * challenge's own reference solver from the puzzle alone.
 */
describe("every challenge is solvable from what a player is sent", () => {
  it("has a flag in the answer key for every challenge, and no strays", () => {
    expect(Object.keys(answerKey.flags).sort()).toEqual(slugs());
  });

  for (const slug of puzzleSlugs()) {
    it(`${slug} solves to each player's own flag`, async () => {
      const [{ build }, { solve }] = await Promise.all([builderFor(slug), solverFor(slug)]);
      for (const seed of seeds) {
        const flag = personalFlag(answerKey.flags[slug], seed, slug);
        const payload = build({ flag, slug });
        expect(await solve({ payload, slug }), `${slug} for seed ${seed}`).toBe(flag);
        expect(JSON.stringify(payload), `${slug} ships its flag in plaintext`).not.toContain(
          flag,
        );
      }
    });
  }

  it("deals different players different puzzles", async () => {
    for (const slug of puzzleSlugs()) {
      const { build } = await builderFor(slug);
      const shipped = seeds.map((seed) =>
        JSON.stringify(build({ flag: personalFlag(answerKey.flags[slug], seed, slug), slug })),
      );
      expect(new Set(shipped).size, `${slug} dealt two players the same puzzle`).toBe(
        seeds.length,
      );
    }
  });
});

describe("personal flags", () => {
  const base = "pctf{some_phrase}";

  it("are the base phrase with a six-character suffix", () => {
    expect(personalFlag(base, seeds[0], "x")).toMatch(/^pctf\{some_phrase_[a-z2-9]{6}\}$/);
  });

  it("are stable for a player and differ between players and challenges", () => {
    expect(personalFlag(base, seeds[0], "x")).toBe(personalFlag(base, seeds[0], "x"));
    expect(suffixFor(seeds[0], "x")).not.toBe(suffixFor(seeds[1], "x"));
    expect(suffixFor(seeds[0], "x")).not.toBe(suffixFor(seeds[0], "y"));
  });

  it("can be traced back to their phrase, so a borrowed one is recognised", () => {
    expect(baseOf(personalFlag(base, seeds[1], "x"))).toBe(base);
    expect(baseOf("pctf{some_words}")).toBeNull();
  });

  it("are compared forgivingly about case and whitespace, not about content", () => {
    expect(normalizeFlag("  PCTF{Some_Phrase}  ")).toBe("pctf{some_phrase}");
    expect(normalizeFlag("pctf{some_phrasf}")).not.toBe("pctf{some_phrase}");
  });
});
