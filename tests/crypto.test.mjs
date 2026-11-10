import { describe, expect, it } from "vitest";

import {
  derive,
  flagDigest,
  fromHex,
  normalizeFlag,
  PURPOSE,
  SEALED,
  seal,
  toHex,
  unseal,
} from "../src/lib/kdf.js";
import { answerKey, flags, isSample, registry } from "./helpers.mjs";

const eachVariant = function* () {
  for (const slug of registry.order) {
    for (const [variant, entry] of registry.challenges[slug].variants.entries()) {
      yield { slug, variant, entry, flag: flags[slug][variant] };
    }
  }
};

const rand = (n) => crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));

describe("flag normalization", () => {
  it("is forgiving about case and whitespace, not about content", () => {
    expect(normalizeFlag("  PCTF{Foo_Bar}  ")).toBe("pctf{foo_bar}");
    expect(normalizeFlag("pctf{a  b}")).toBe("pctf{a b}");
    expect(normalizeFlag("pctf{x}")).not.toBe("pctf{y}");
  });
});

describe("key derivation", () => {
  it("separates purposes, so two uses of one secret cannot be confused", async () => {
    const salt = rand(16);
    const [a, b] = await Promise.all([
      derive("a secret", PURPOSE.seal, salt),
      derive("a secret", "pocket-ctf/test/other", salt),
    ]);
    expect(toHex(a)).not.toBe(toHex(b));
  });

  it("separates salts, so the same secret seals differently each time", async () => {
    const a = await derive("a secret", PURPOSE.seal, rand(16));
    const b = await derive("a secret", PURPOSE.seal, rand(16));
    expect(toHex(a)).not.toBe(toHex(b));
  });
});

describe("sealed content", () => {
  it("round-trips under the right secret", async () => {
    const salt = rand(16);
    const iv = rand(12);
    const ct = await seal("secret", salt, "the writeup", iv);
    expect(await unseal("secret", salt, ct, iv)).toBe("the writeup");
  });

  it("returns null under the wrong secret rather than plausible garbage", async () => {
    const salt = rand(16);
    const iv = rand(12);
    const ct = await seal("secret", salt, "the writeup", iv);
    expect(await unseal("wrong", salt, ct, iv)).toBeNull();
  });
});

describe("the registry", () => {
  it("recognises each flag by its digest, and nothing near it", async () => {
    for (const { entry, flag: raw } of eachVariant()) {
      const flag = normalizeFlag(raw);
      expect(await flagDigest(flag, registry.pepper)).toBe(entry.digest);
      expect(await flagDigest(`${flag}x`, registry.pepper)).not.toBe(entry.digest);
    }
  });

  it("gives every flag its own digest", () => {
    // A submission names no challenge, so the digest is the only thing that
    // says which one it solved. Two alike would make one of them unreachable.
    const digests = [...eachVariant()].map(({ entry }) => entry.digest);
    expect(new Set(digests).size).toBe(digests.length);
  });

  it("depends on this deployment's pepper", async () => {
    const [{ entry, flag }] = [...eachVariant()];
    const elsewhere = toHex(rand(32));
    expect(await flagDigest(normalizeFlag(flag), elsewhere)).not.toBe(entry.digest);
  });

  it("holds no flag in plaintext", () => {
    const serialized = JSON.stringify(registry);
    for (const { flag } of eachVariant()) {
      expect(serialized).not.toContain(normalizeFlag(flag));
    }
  });

  it("opens each writeup with its own key, and with nothing else", async () => {
    for (const { slug, variant, entry } of eachVariant()) {
      const { salt, iv, ct } = entry.writeup;
      const opened = await unseal(
        SEALED.writeup(slug, variant),
        fromHex(salt),
        ct,
        fromHex(iv),
      );
      expect(opened).toBeTypeOf("string");
      expect(
        await unseal(SEALED.writeup(slug, variant + 1), fromHex(salt), ct, fromHex(iv)),
      ).toBeNull();
    }
  });
});

describe("hints", () => {
  it("decrypt to the authored text, in every variant", async () => {
    for (const { slug, variant, entry } of eachVariant()) {
      const sealed = entry.hints ?? [];
      const authored = answerKey.hints?.[slug] ?? [];
      expect(sealed.length).toBe(authored.length);
      for (const [i, h] of sealed.entries()) {
        const text = await unseal(
          SEALED.hint(slug, variant, i),
          fromHex(h.salt),
          h.ct,
          fromHex(h.iv),
        );
        expect(text).toBe(authored[i]);
      }
    }
  });

  it("are absent as plaintext from the registry", () => {
    const serialized = JSON.stringify(registry);
    for (const list of Object.values(answerKey.hints ?? {})) {
      for (const hint of list) expect(serialized).not.toContain(hint.slice(0, 40));
    }
  });

  it.skipIf(isSample)("exist for every challenge in a real deployment", () => {
    for (const { entry } of eachVariant()) {
      expect(entry.hints.length).toBeGreaterThan(0);
    }
  });
});

describe("decoys", () => {
  it("are recognised, so submitting one can be answered", async () => {
    const planted = Object.keys(answerKey.honeypots ?? {});
    expect(planted.length).toBeGreaterThan(0);
    const known = new Set(registry.honeypots.map((h) => h.digest));
    for (const decoy of planted) {
      expect(known.has(await flagDigest(normalizeFlag(decoy), registry.pepper))).toBe(true);
    }
  });

  it("are never mistaken for a real flag", () => {
    const real = new Set([...eachVariant()].map(({ entry }) => entry.digest));
    for (const { digest } of registry.honeypots) expect(real.has(digest)).toBe(false);
  });
});
