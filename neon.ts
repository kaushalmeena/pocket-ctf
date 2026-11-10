import { defineConfig } from "@neon/config/v1";

/**
 * Neon project configuration, read by the Neon CLI (`neon checkout`,
 * `neon config plan`, `neon deploy`).
 *
 * Two kinds of branch matter here: `production`, which the deployed site
 * uses, and `dev`, a long-lived copy for local work so that playing, testing
 * and `pnpm self-test` never write to production. `neon checkout dev` points
 * `.env` at it. Anything else is a throwaway and expires on its own.
 */
export default defineConfig({
  auth: false,
  branch: (branch) => {
    if (branch.isDefault) return {};
    if (!branch.exists) {
      // dev is meant to stay; every other new branch is scratch.
      return branch.name === "dev" ? {} : { ttl: "7d" };
    }
    return {};
  },
});
