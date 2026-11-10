import { createFileRoute } from "@tanstack/solid-router";

import { trail } from "~/server/plants";

/**
 * The link tracker behind the footer's one outbound link.
 *
 * Every hop is a redirect to the next, and a browser shows none of them.
 */
export const Route = createFileRoute("/go/$hop")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const step = await trail(Math.max(0, Math.trunc(Number(params.hop)) || 0));
        const headers = new Headers({ Location: step.next });
        if (step.piece !== null) headers.set("X-Trail", step.piece);
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
