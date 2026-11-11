import { createFileRoute } from "@tanstack/solid-router";

import { drawCard, profileOf } from "~/server/card";

/** The picture a link to a player's profile unfurls as. */
export const Route = createFileRoute("/u/$handle/card.png")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const profile = await profileOf(params.handle);
        if (!profile) return new Response("No such player.", { status: 404 });
        return new Response(new Uint8Array(drawCard(profile)), {
          headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
        });
      },
    },
  },
});
