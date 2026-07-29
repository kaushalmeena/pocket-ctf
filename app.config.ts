import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  ssr: true,
  server: {
    // Emit a plain folder of HTML/JS so the whole CTF can be served by any
    // static file server -- or opened straight off disk. No backend, ever.
    preset: "static",
    prerender: {
      crawlLinks: true,
      // Unlisted routes are deliberately not linked from anywhere.
      routes: ["/", "/vault/omega", "/404"],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Source maps would hand out the un-minified challenge internals.
      sourcemap: false,
    },
  },
});
