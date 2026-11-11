import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins/anonymous";
import { tanstackStartCookies } from "better-auth/tanstack-start/solid";

import { db } from "./db";
import { merge } from "./merge";
import * as schema from "./schema";

/**
 * Identity, by Better Auth.
 *
 * Nobody signs up to play. A visitor is dealt their puzzles from a cookie and
 * nothing is written until they do something worth keeping; at that point the
 * server signs them in as an anonymous Better Auth user (see `persist` in
 * players.ts). Claiming the progress with GitHub links that anonymous user to
 * a real account, which is what lets a player pick up where they left off in
 * another browser.
 *
 * Better Auth's tables -- user, session, account, verification -- live in the
 * same Postgres database as the hunt, declared in schema.ts and created by the
 * same drizzle-kit migrations.
 */

const GITHUB = {
  clientId: process.env.GITHUB_CLIENT_ID ?? "",
  clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
};

/** Claiming is offered only when the server can actually do it. */
export const GITHUB_ENABLED = Boolean(GITHUB.clientId && GITHUB.clientSecret);

/*
 * Signs session cookies. A fixed fallback is fine on a laptop and nowhere else:
 * anyone holding it can mint a session for any user.
 */
function secret() {
  const configured = process.env.BETTER_AUTH_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BETTER_AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.",
    );
  }
  return "pocket-ctf-development-secret-do-not-deploy";
}

const makeOptions = () =>
  ({
    appName: "Pocket CTF",
    secret: secret(),
    /*
     * The public origin, in production only. A local .env usually holds the
     * deployed site's origin too (for canonical tags), and handing that to
     * Better Auth on a laptop would send every GitHub sign-in back to the live
     * site; in development it reads the origin off each request instead.
     */
    baseURL: process.env.NODE_ENV === "production" ? process.env.POCKET_CTF_URL : undefined,
    database: drizzleAdapter(db(), { provider: "pg", schema }),
    socialProviders: GITHUB_ENABLED ? { github: GITHUB } : {},
    session: {
      expiresIn: 60 * 60 * 24 * 365,
      // Sessions are looked up on every request; this saves the round trip.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    plugins: [
      anonymous({
        emailDomainName: "anonymous.pocket-ctf.invalid",
        generateName: () => "anonymous",
        onLinkAccount: ({ anonymousUser, newUser }) =>
          merge(anonymousUser.user.id, newUser.user.id),
      }),
      // Must be last: it copies Set-Cookie from server-side auth calls onto the
      // response TanStack Start is building.
      tanstackStartCookies(),
    ],
  }) satisfies BetterAuthOptions;

type Options = ReturnType<typeof makeOptions>;

/*
 * Created once per process, like the database pool, and on first use rather
 * than at import: building it reads env vars and opens the pool.
 */
const holder = globalThis as { pocketCtfAuth?: ReturnType<typeof betterAuth<Options>> };

export function auth() {
  holder.pocketCtfAuth ??= betterAuth(makeOptions());
  return holder.pocketCtfAuth;
}
