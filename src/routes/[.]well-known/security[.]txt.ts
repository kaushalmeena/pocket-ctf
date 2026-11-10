import { createFileRoute } from "@tanstack/solid-router";

import { SITE_URL } from "~/lib/seo";

/**
 * RFC 9116. A real convention, used here as intended: it tells a researcher
 * where reports go. Where they go happens to be worth visiting.
 */
const BODY = `# If you found something, we would love to hear about it.
# If you found *that*, you were supposed to.

Contact: ${SITE_URL}/dead-drop
Preferred-Languages: en
Policy: ${SITE_URL}/humans.txt
Expires: 2099-12-31T23:59:59.000Z

# Reports left at the contact address are encrypted. The previous maintainer
# chose the cipher, and then chose a key shorter than the message.
`;

export const Route = createFileRoute("/.well-known/security.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(BODY, { headers: { "Content-Type": "text/plain; charset=utf-8" } }),
    },
  },
});
