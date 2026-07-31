import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { defineConfig } from "vite";
import viteSolid from "vite-plugin-solid";

/**
 * One dynamic route serves every challenge, so the prerenderer has to be told
 * which slugs exist. Read from the same directories the app discovers, so a new
 * challenge is prerendered without touching this file.
 */
function challengePages() {
  const dir = fileURLToPath(new URL("./src/challenges", import.meta.url));
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ path: `/c/${e.name}`, prerender: { enabled: true } }));
}

export default defineConfig({
  server: { port: 3000 },
  resolve: {
    // Mirrors the `~/*` -> `./src/*` alias in tsconfig.json.
    //
    // Note: no `conditions` here on purpose. Setting it *replaces* Vite's
    // defaults rather than adding to them, and vite-plugin-solid already
    // prepends "solid" to whatever the defaults are. An explicit
    // `conditions: ["solid"]` silently dropped "node"/"module", so the server
    // build resolved @tanstack/solid-router's browser entry and prerendering
    // died in createBrowserHistory.
    alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  ssr: {
    // lucide-solid ships a precompiled ESM build that calls `template()` from
    // solid-js/web at module scope -- a client-only API. Its `solid` export
    // condition points at raw JSX instead, which vite-plugin-solid compiles for
    // the server too, but externalised dependencies are loaded straight by Node
    // during dev and skip Vite's resolution entirely. Bundling it keeps the
    // plugin's conditions in force on the server.
    noExternal: ["lucide-solid"],
  },
  plugins: [
    // tanstackStart MUST come before the solid plugin.
    tanstackStart({
      // Every route is prerendered to real HTML so the finished CTF is a plain
      // folder of files -- no backend, no network, openable from a USB stick.
      // It also means "view source" is a legitimate move on a challenge page.
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: true,
      },
      pages: challengePages(),
    }),
    viteSolid({ ssr: true }),
    tailwindcss(),
  ],
  build: {
    // Source maps would hand out the un-minified challenge internals.
    sourcemap: false,

    /*
     * Terser rather than the default esbuild, for two things esbuild will not
     * do: `mangle.toplevel` renames module-level bindings, and `drop_console`
     * removes logging outright.
     *
     * This is a speed bump, not a defence -- anyone determined will still read
     * the bundle, and the design assumes they can (no flag is in it). What it
     * changes is the cost of a casual skim: `verifyHash`, `tokenSalt` and
     * `unsealPublic` stop being greppable names attached to obvious call sites.
     */
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        // Two passes so the constant folding from the first can be inlined by
        // the second; measurably smaller on a bundle this size.
        passes: 2,
      },
      mangle: { toplevel: true },
      format: { comments: false },
    },
  },
});
