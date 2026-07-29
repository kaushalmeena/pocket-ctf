import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { defineConfig } from "vite";
import viteSolid from "vite-plugin-solid";

export default defineConfig({
  server: { port: 3000 },
  resolve: {
    // Mirrors the `~/*` -> `./src/*` alias in tsconfig.json.
    alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
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
