import { createFileRoute } from "@tanstack/solid-router";

import { pulse } from "~/server/plants";

const ALLOW = "GET, HEAD, OPTIONS";

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json; charset=utf-8", ...init.headers },
  });

const refuse = () =>
  json(
    { error: "Method Not Allowed", detail: "It only keeps time. It does not take requests." },
    { status: 405, headers: { Allow: ALLOW } },
  );

/** The heartbeat the footer light keeps time to. */
export const Route = createFileRoute("/api/pulse")({
  server: {
    handlers: {
      GET: async () => json(await pulse()),
      OPTIONS: () => new Response(null, { status: 204, headers: { Allow: ALLOW } }),
      PUT: refuse,
      POST: refuse,
      PATCH: refuse,
      DELETE: refuse,
    },
  },
});
