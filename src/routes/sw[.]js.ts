import { createFileRoute } from "@tanstack/solid-router";

/**
 * The service worker. It caches nothing -- every page here is dealt to one
 * player, and a stale one would be wrong -- and touches only page navigations,
 * passing each straight to the network. Its one job is the moment the network
 * is not there.
 */
const OFFLINE_PAGE = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>No signal — Pocket CTF</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center;
         font: 15px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
         background: #09090b; color: #d4d4d8; }
  main { max-width: 34rem; padding: 2rem; }
  h1 { font-size: 1.6rem; margin: 0 0 1rem; color: #fafafa; }
  p { margin: 0 0 0.8rem; }
  .dim { color: #71717a; }
</style>
<main>
  <h1>No signal.</h1>
  <p>You are offline, in the middle of a hunt that lives entirely on a server.</p>
  <p>Honestly? Good. Go outside. Touch some grass. The flags will wait; they have
     been hiding this long.</p>
  <p class="dim">This page reloads itself when the network comes back, and the site
     will remember you left.</p>
</main>
<script>
  try { localStorage.setItem("pctf-offline", String(Date.now())); } catch {}
  addEventListener("online", () => location.reload());
</script>
</html>`;

const WORKER = `// Pocket CTF service worker. Caches nothing; see /sw.js's source on the server.
const OFFLINE_PAGE = ${JSON.stringify(OFFLINE_PAGE)};

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});
`;

export const Route = createFileRoute("/sw.js")({
  server: {
    handlers: {
      GET: () =>
        new Response(WORKER, {
          headers: {
            "Content-Type": "text/javascript; charset=utf-8",
            // Browsers check for a new worker on navigation; never serve a stale one.
            "Cache-Control": "no-cache",
          },
        }),
    },
  },
});
