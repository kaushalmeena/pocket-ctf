import { createMiddleware, createStart } from "@tanstack/solid-start";

/**
 * Headers every response carries.
 *
 * Two of them are for the player rather than the browser. `Link` points at a
 * page nothing on the site links to, and `X-Flag` is a decoy for whoever reads
 * headers looking for exactly that word.
 */
const responseHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const headers = result.response.headers;

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  headers.set("X-Powered-By", "curiosity");
  headers.set("X-Flag", "pctf{x_marks_the_header}");
  headers.set("Link", '</machine>; rel="help"; title="nobody renders this header"');

  // Every page is rendered for one player. Nothing here belongs in a shared cache.
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "private, no-store");
  return result;
});

export const startInstance = createStart(() => ({ requestMiddleware: [responseHeaders] }));
