import { createFileRoute } from "@tanstack/solid-router";

import { SITE_URL } from "~/lib/seo";

/*
 * robots.txt is a polite request, not a security control -- which is exactly
 * why it is a good place to learn where a site would rather you did not look.
 */
const BODY = `# Pocket CTF
#
# Crawlers: the front page is yours. Please leave the rest alone.
# Humans: this file is not addressed to you. Carry on.

User-agent: *
Allow: /$
Disallow: /trophies
Disallow: /board
Disallow: /u/
Disallow: /api/

# Staff only. Nothing to see. Certainly nothing to index.
Disallow: /staff

Sitemap: ${SITE_URL}/sitemap.xml
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(BODY, { headers: { "Content-Type": "text/plain; charset=utf-8" } }),
    },
  },
});
