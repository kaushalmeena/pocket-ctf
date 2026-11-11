import { createFileRoute } from "@tanstack/solid-router";

import { transmit } from "~/server/game";
import { currentPlayer } from "~/server/players";

/**
 * Flag submission, for people who would rather not use the form.
 *
 * `POST /api/flag` with `{"flag": "pctf{...}"}` and the session cookie. It runs
 * exactly what the prompt on the front page runs, throttle included, so
 * scripting a solve is welcome and scripting a wordlist is not.
 */
export const Route = createFileRoute("/api/flag")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let flag = "";
        try {
          const body = await request.json();
          if (typeof body?.flag === "string") flag = body.flag;
        } catch {
          /* fall through to the 400 */
        }
        if (!flag) {
          return Response.json({ error: 'Send JSON: {"flag": "pctf{...}"}' }, { status: 400 });
        }
        return Response.json(await transmit(await currentPlayer(), flag));
      },
    },
  },
});
