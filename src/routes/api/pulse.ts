import { createFileRoute } from "@tanstack/solid-router";

import { pulse, wrongVerb } from "~/server/plants";

const ALLOW = "GET, HEAD, OPTIONS, PUT";

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json; charset=utf-8", ...init.headers },
  });

const refuse = () =>
  json(
    { error: "Method Not Allowed", detail: "Not that verb. Ask what is allowed here." },
    { status: 405, headers: { Allow: ALLOW } },
  );

/**
 * The heartbeat the footer light keeps time to.
 *
 * `GET` is all the site itself ever sends. The endpoint answers one other verb
 * a browser would never send by accident, and says so to anyone who asks with
 * `OPTIONS`.
 */
export const Route = createFileRoute("/api/pulse")({
  server: {
    handlers: {
      GET: async () => json(await pulse()),
      OPTIONS: () => new Response(null, { status: 204, headers: { Allow: ALLOW } }),
      PUT: async () =>
        json({
          written: false,
          detail:
            "Nothing here can be written. Thank you for asking in a verb nobody else tried.",
          flag: await wrongVerb(),
        }),
      POST: refuse,
      PATCH: refuse,
      DELETE: refuse,
    },
  },
});
