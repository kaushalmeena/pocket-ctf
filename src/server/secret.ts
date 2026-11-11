import { createHmac } from "node:crypto";

/**
 * The server's own secret, which every per-player value is keyed with.
 *
 * A player's seed is not enough on its own: before enrolment it is derived
 * from their `pctf_deal` cookie, which they can read in devtools, and the
 * derivation is in this repository. Keying everything that comes from the
 * seed -- flag suffixes, the door and lounge codes, the finale address, the
 * MACs on tickets and cookies -- with a value only the server holds is what
 * makes them impossible to work out from the outside.
 *
 * Changing it changes every player's flags and codes. Progress is kept (a
 * solve is a row, not a flag), but anything a player had found and not yet
 * submitted stops working.
 */

export const SECRET_ENV = "POCKET_CTF_SECRET";

function load() {
  const configured = process.env[SECRET_ENV];
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${SECRET_ENV} is not set. Generate one with \`openssl rand -base64 32\`.`);
  }
  // Fine on a laptop and nowhere else: anyone holding it can work out every flag.
  return "pocket-ctf-development-secret-do-not-deploy";
}

export const SERVER_SECRET = load();

/** HMAC-SHA256 of `label` under the server secret, as hex. */
export const keyed = (label: string) =>
  createHmac("sha256", SERVER_SECRET).update(label).digest("hex");
