import { createFileRoute } from "@tanstack/solid-router";

import { simon } from "~/server/plants";

/** Simon's endpoint. Every verb reaches it; only the right one, at the right time, helps. */
const handle = async ({ request }: { request: Request }) => {
  const ticket = new URL(request.url).searchParams.get("ticket");
  const polite = request.headers.get("x-simon")?.trim().toLowerCase() === "please";
  const { status, body } = await simon(request.method, ticket, polite);
  return Response.json(body, { status });
};

export const Route = createFileRoute("/api/simon")({
  server: {
    handlers: { GET: handle, POST: handle, PUT: handle, PATCH: handle, DELETE: handle },
  },
});
