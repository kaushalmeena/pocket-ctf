import { createFileRoute } from "@tanstack/solid-router";

import { STATUS_ETAG, status } from "~/server/plants";

/**
 * What the footer asks on every page: is the site up?
 *
 * It supports conditional requests, and is more forthcoming than it should be
 * with a client that says it is behind.
 */
export const Route = createFileRoute("/api/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const result = await status(request.headers.get("if-none-match"));
        const headers = { ETag: STATUS_ETAG, "Cache-Control": "no-cache" };
        if (result.notModified) return new Response(null, { status: 304, headers });
        return Response.json(result.body, { headers });
      },
    },
  },
});
