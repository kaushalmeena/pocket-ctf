import { createFileRoute } from "@tanstack/solid-router";
import { Coffee } from "lucide-solid";
import { onMount } from "solid-js";

import { Room } from "~/components/Room";
import { getTeapot } from "~/lib/api";
import { useGame } from "~/lib/game";
import { NO_INDEX } from "~/lib/seo";

export const Route = createFileRoute("/teapot")({
  loader: () => getTeapot(),
  head: () => ({ meta: [{ title: "418 — Pocket CTF" }, NO_INDEX] }),
  component: Teapot,
});

function Teapot() {
  const brew = Route.useLoaderData();
  const { award } = useGame();

  onMount(() => award(brew().trophies));

  return (
    <Room label="418 · I'm a teapot" title="Short and stout.">
      <Coffee aria-hidden="true" size={56} class="text-accent-600 dark:text-accent-400" />
      <p class="prose-mini">
        You asked a teapot for a web page. Under RFC 2324, the Hyper Text Coffee Pot Control
        Protocol, any attempt to brew coffee with a teapot should be refused, and this one takes
        its responsibilities seriously.
      </p>
      <p class="prose-mini">
        There is no flag in here. There was never going to be a flag in here. There is, however,
        something for people who type addresses into a browser just to see what happens.
      </p>
    </Room>
  );
}
