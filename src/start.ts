import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/solid-start";

import { forCrawlers, plainFrontPage } from "~/server/plants";

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
  // The front page has another representation; see `plainText` below.
  headers.set("Vary", "Accept");

  // Every page is rendered for one player. Nothing here belongs in a shared cache.
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "private, no-store");
  return result;
});

/** True when a client asked for text and did not also ask for HTML. */
const wantsText = (accept: string | null) =>
  Boolean(accept && /\btext\/plain\b/.test(accept) && !/\btext\/html\b/.test(accept));

/**
 * Content negotiation for the front page. Browsers ask for HTML and get it; a
 * client that asks for `text/plain` gets the text version, which carries one
 * line the HTML does not.
 */
const plainText = createMiddleware().server(async ({ request, next }) => {
  const url = new URL(request.url);
  if (
    request.method === "GET" &&
    url.pathname === "/" &&
    wantsText(request.headers.get("accept"))
  ) {
    return new Response(await plainFrontPage(), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return next();
});

const CRAWLER = /googlebot|bingbot|duckduckbot|yandex(bot)?|baiduspider|applebot|slurp/i;

/** This site's own cookies: the deal every visitor gets, or a session. */
const knownHere = (cookie: string | null) =>
  Boolean(cookie && /(^|;\s*)(pctf_deal|[\w.-]*session_token)=/.test(cookie));

/**
 * Pages served to anything claiming to be a search engine are a different,
 * worse page. Real crawlers carry no cookies and are left alone; a person who
 * changed their User-Agent carries ours.
 */
const cloaking = createMiddleware().server(async ({ request, next }) => {
  const accept = request.headers.get("accept") ?? "";
  const path = new URL(request.url).pathname;
  if (
    request.method === "GET" &&
    // Pages only: not the API, server functions or files.
    !/^\/(api|_)/.test(path) &&
    !/\.[a-z0-9]+$/i.test(path) &&
    /text\/html|\*\/\*/.test(accept) &&
    CRAWLER.test(request.headers.get("user-agent") ?? "") &&
    knownHere(request.headers.get("cookie"))
  ) {
    return new Response(await forCrawlers(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return next();
});

/*
 * Server functions are same-origin RPC: the prompt, clue purchases, renames
 * and recovery all go through them. This refuses any that arrive from another
 * site. The plain `/api/*` routes are left open on purpose -- they are part of
 * the hunt, and are meant to be poked at with curl.
 */
const csrf = createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" });

export const startInstance = createStart(() => ({
  requestMiddleware: [csrf, responseHeaders, plainText, cloaking],
}));
