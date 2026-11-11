import { createFileRoute } from "@tanstack/solid-router";

import { auth } from "~/server/auth";

/** Better Auth's own endpoints: the GitHub redirect and callback, sign-out. */
const handle = ({ request }: { request: Request }) => auth().handler(request);

export const Route = createFileRoute("/api/auth/$")({
  server: { handlers: { GET: handle, POST: handle } },
});
