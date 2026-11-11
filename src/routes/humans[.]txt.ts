import { createFileRoute } from "@tanstack/solid-router";

/** Not a puzzle. Says so, which in this building proves nothing. */
const BODY = `/* TEAM */
One person, several late evenings, and a kettle.

/* THANKS */
Everyone who ever typed a URL just to see what would happen.
You are the intended audience.

/* SITE */
Standards: HTTP, including the parts of it nobody uses.
Easter eggs: yes. No, this file is not one of them.
`;

export const Route = createFileRoute("/humans.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(BODY, { headers: { "Content-Type": "text/plain; charset=utf-8" } }),
    },
  },
});
