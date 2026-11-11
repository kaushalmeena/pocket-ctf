import { createAuthClient } from "better-auth/solid";

/**
 * The browser's half of Better Auth: just enough to send a player to GitHub
 * and back, and to sign them out. Anonymous sign-in never happens from here --
 * the server does it, and only when there is something to save.
 */
export const authClient = createAuthClient();
