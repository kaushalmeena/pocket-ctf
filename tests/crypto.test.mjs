import { describe, expect, it } from "vitest";
import {
  derive,
  fromHex,
  normalizeFlag,
  PURPOSE,
  seal,
  sha256Hex,
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
  it("separates purposes, so one flag's three values cannot be confused", async () => {
    const salt = rand(16);
    const [v, t, s] = await Promise.all([
      derive("pctf{x}", PURPOSE.verify, salt),
      derive("pctf{x}", PURPOSE.token, salt),
      derive("pctf{x}", PURPOSE.seal, salt),
    ]);
    expect(toHex(v)).not.toBe(toHex(t));
    expect(toHex(t)).not.toBe(toHex(s));
  });

  it("separates salts, so the same flag differs across deployments", async () => {
    const a = await derive("pctf{x}", PURPOSE.verify, rand(16));
    const b = await derive("pctf{x}", PURPOSE.verify, rand(16));
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
  it("verifies each flag and no other", async () => {
    for (const { entry, flag: raw } of eachVariant()) {
      const flag = normalizeFlag(raw);
      const good = toHex(await derive(flag, PURPOSE.verify, fromHex(entry.verifySalt)));
      const bad = toHex(await derive(`${flag}x`, PURPOSE.verify, fromHex(entry.verifySalt)));
      expect(good).toBe(entry.verifyHash);
      expect(bad).not.toBe(entry.verifyHash);
    }
  });

  it("stores only a digest of the proof-of-solve token", async () => {
    for (const { entry, flag: raw } of eachVariant()) {
      const flag = normalizeFlag(raw);
      const token = toHex(await derive(flag, PURPOSE.token, fromHex(entry.tokenSalt)));
      expect(await sha256Hex(token)).toBe(entry.tokenHash);
      // The token itself must not be recoverable from what ships.
      expect(JSON.stringify(entry)).not.toContain(token);
    }
  });

  it("will not let one challenge's token validate another", async () => {
    const [a, b] = registry.order;
    const entryA = registry.challenges[a].variants[0];
    const tokenA = toHex(
      await derive(normalizeFlag(flags[a][0]), PURPOSE.token, fromHex(entryA.tokenSalt)),
    );
    expect(await sha256Hex(tokenA)).not.toBe(registry.challenges[b].variants[0].tokenHash);
  });

  it("decrypts each writeup with its flag, and with nothing else", async () => {
    for (const { entry, flag: raw } of eachVariant()) {
      const flag = normalizeFlag(raw);
      const opened = await unseal(
        flag,
        fromHex(entry.sealSalt),
        entry.writeup,
        fromHex(entry.sealIv),
      );
      expect(opened).toBeTypeOf("string");
      expect(
        await unseal(`${flag}x`, fromHex(entry.sealSalt), entry.writeup, fromHex(entry.sealIv)),
      ).toBeNull();
    }
  });
});

describe("hints", () => {
  const hintSecret = (slug, variant, index) => `pocket-ctf/hint/${slug}/${variant}/${index}`;

  it("decrypt to the authored text, in every variant", async () => {
    for (const { slug, variant, entry } of eachVariant()) {
      const sealed = entry.hints ?? [];
      const authored = answerKey.hints?.[slug] ?? [];
      expect(sealed.length).toBe(authored.length);
      for (const [i, h] of sealed.entries()) {
        const text = await unseal(
          hintSecret(slug, variant, i),
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
  it("look like real entries but belong to no challenge", () => {
    const phantoms = registry.$decoys ?? {};
    expect(Object.keys(phantoms).length).toBeGreaterThan(0);
    for (const [name, entry] of Object.entries(phantoms)) {
      // Same shape, so dumping the JSON does not separate them at a glance.
      expect(entry).toHaveProperty("verifySalt");
      expect(entry).toHaveProperty("verifyHash");
      // But no page, no payload, and no route.
      expect(registry.order).not.toContain(name);
    }
  });

  it("cannot be satisfied by any flag", async () => {
    // Their verifyHash is the hash of a non-flag string, so no submission
    // matching the flag grammar can ever validate against one.
    for (const [name, entry] of Object.entries(registry.$decoys ?? {})) {
      for (const { slug, flag } of eachVariant()) {
        const attempt = toHex(
          await derive(normalizeFlag(flag), PURPOSE.verify, fromHex(entry.verifySalt)),
        );
        expect(attempt, `${slug} matched decoy ${name}`).not.toBe(entry.verifyHash);
      }
    }
  });
});
