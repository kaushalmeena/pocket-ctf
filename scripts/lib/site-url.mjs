/**
 * The public origin, from wherever this deployment says it is.
 *
 *   1. POCKET_CTF_URL, when set: any host, any custom domain.
 *   2. On Vercel, its own system variables, which it sets at build time and at
 *      runtime: the production domain for production (a custom domain once one
 *      is added), and the branch or deployment URL for a preview.
 *   3. Nothing: the caller decides. The browser bundle falls back to
 *      localhost; Better Auth reads the origin off each request.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string} an origin with no trailing slash, or ""
 */
export function siteUrl(env = process.env) {
  if (env.POCKET_CTF_URL) return env.POCKET_CTF_URL.replace(/\/+$/, "");
  const host =
    env.VERCEL_ENV === "production"
      ? env.VERCEL_PROJECT_PRODUCTION_URL
      : env.VERCEL_BRANCH_URL || env.VERCEL_URL;
  return host ? `https://${host}` : "";
}
