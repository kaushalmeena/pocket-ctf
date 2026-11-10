import { createFileRoute, notFound } from "@tanstack/solid-router";

import { Room } from "~/components/Room";
import { getVault } from "~/lib/api";
import { NO_INDEX } from "~/lib/seo";

/**
 * The address the fragments spell. It exists for one player; for everyone
 * else, and for every wrong guess, this is just another page that is not there.
 */
export const Route = createFileRoute("/vault/$key")({
  loader: async ({ params }) => {
    const vault = await getVault({ data: params.key });
    if (!vault) throw notFound();
    return vault;
  },
  head: () => ({ meta: [{ title: "The vault — Pocket CTF" }, NO_INDEX] }),
  component: Vault,
});

function Vault() {
  const vault = Route.useLoaderData();

  return (
    <Room label="End of the line" title="You were not supposed to find this.">
      <p class="prose-mini">
        Nothing links here. Nothing lists it. The address was never written down in one piece
        anywhere, including on our side: it was handed to you a couple of characters at a time,
        by every flag you found, and it would not have opened for anybody else.
      </p>
      <p class="prose-mini">
        Every other hiding place on this site depended on you looking somewhere ordinary. This
        one only needed you to finish. Here is the last of them.
      </p>
      <p class="blob">{vault().flag}</p>
      <p class="prose-mini">Take it to the front page. Then go outside.</p>
    </Room>
  );
}
