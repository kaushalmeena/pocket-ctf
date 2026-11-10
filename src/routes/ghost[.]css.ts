import { createFileRoute } from "@tanstack/solid-router";

import { ghostStylesheet } from "~/server/plants";

const PREAMBLE = `/*
 * ghost.css
 *
 * Legacy ornaments. Nothing on the site uses these classes any more, and
 * nobody has dared delete the file. Do not reorder.
 */

`;

/** Linked from every page, styling nothing. */
export const Route = createFileRoute("/ghost.css")({
  server: {
    handlers: {
      GET: async () =>
        new Response(`${PREAMBLE}${await ghostStylesheet()}\n`, {
          headers: {
            "Content-Type": "text/css; charset=utf-8",
            "Cache-Control": "private, max-age=3600",
          },
        }),
    },
  },
});
