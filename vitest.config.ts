import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node-only: the suite exercises build-time generators, reference solvers
    // and the KDF, none of which need a DOM.
    environment: "node",
    include: ["tests/**/*.test.mjs"],
    // PBKDF2 at 310k rounds is deliberately slow; the crypto suite runs a few
    // hundred derivations.
    testTimeout: 30_000,
  },
});
