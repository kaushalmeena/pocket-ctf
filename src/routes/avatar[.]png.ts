import { createFileRoute } from "@tanstack/solid-router";

import { portrait } from "~/server/plants";

/** The portrait each player is issued. Looks like noise; mostly is. */
export const Route = createFileRoute("/avatar.png")({
  server: {
    handlers: {
      GET: async () =>
        new Response(new Uint8Array(await portrait()), {
          headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
        }),
    },
  },
});
