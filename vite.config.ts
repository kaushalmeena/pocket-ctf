import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { defineConfig } from "vite";
import viteSolid from "vite-plugin-solid";

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
      // Unlisted pages are deliberately not linked from anywhere, so the
      // crawler can't find them. They still have to ship.
      pages: [{ path: "/vault/omega", prerender: { enabled: true } }],
    }),
    viteSolid({ ssr: true }),
    tailwindcss(),
  ],
  build: {
    // Source maps would hand out the un-minified challenge internals.
    sourcemap: false,
  },
});
