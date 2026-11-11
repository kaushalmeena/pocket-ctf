import { createFileRoute } from "@tanstack/solid-router";

import { SITE_URL } from "~/lib/seo";

/** One entry. Everything else on the site is either personal or a spoiler. */
const BODY = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(BODY, { headers: { "Content-Type": "application/xml; charset=utf-8" } }),
    },
  },
});
