import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import viteSolid from "vite-plugin-solid";

export default defineConfig(({ mode }) => {
  /*
   * Vite only hands `VITE_`-prefixed variables to the client, and by default
   * puts nothing from `.env` into the server's `process.env` either. The server
   * needs DATABASE_URL and the Better Auth secrets, so they are loaded here --
   * without overwriting anything the environment already set.
   */
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
    process.env[key] ??= value;
  }

  return {
    /*
     * The one project variable the client may see, handed over by name. Not
     * via `envPrefix`: every POCKET_CTF_ variable would follow it into the
     * bundle, the answer key included.
     */
    define: {
      "import.meta.env.POCKET_CTF_URL": JSON.stringify(process.env.POCKET_CTF_URL ?? ""),
    },
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
      /*
       * No prerendering. Every page is rendered per request, for one player: the
       * markup, the cookies and the headers all carry puzzle data dealt to
       * whoever is asking, so there is no static file that would be right twice.
       */
      tanstackStart(),
      // Packages the server for wherever it runs -- a Node process by default,
      // serverless functions on a host Nitro recognises. See docs/deployment.md.
      nitro(),
      viteSolid({ ssr: true }),
      tailwindcss(),
    ],
    build: {
      // Source maps would hand out the un-minified challenge internals.
      sourcemap: false,

      /*
       * Terser rather than the default esbuild, for two things esbuild will not
       * do: `mangle.toplevel` renames module-level bindings.
       *
       * This is a speed bump, not a defence -- anyone determined will still read
       * the bundle, and the design assumes they can: no flag, digest or puzzle
       * list is in it, because all of that stays on the server. What it changes
       * is the cost of a casual skim.
       *
       * `drop_console` is off on purpose. The console is one of the places a
       * player is expected to look, and the site says hello there.
       */
      minify: "terser",
      terserOptions: {
        compress: {
          drop_debugger: true,
          // Two passes so the constant folding from the first can be inlined by
          // the second; measurably smaller on a bundle this size.
          passes: 2,
        },
        mangle: { toplevel: true },
        format: { comments: false },
      },
    },
  };
});
