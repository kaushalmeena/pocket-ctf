import { createFileRoute } from "@tanstack/solid-router";

import { door } from "~/server/plants";

/** A door with a six-digit code and no sense of urgency. */
export const Route = createFileRoute("/api/door")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const guess = (new URL(request.url).searchParams.get("code") ?? "").slice(0, 16);
        const flag = await door(guess);
        if (flag === null) {
          return Response.json(
            { open: false, detail: "Wrong code. Six digits, checked one at a time." },
            { status: 403 },
          );
        }
        return Response.json({ open: true, flag });
      },
    },
  },
});
