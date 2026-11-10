import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { type Client, createClient } from "@libsql/client";

/**
 * The player database.
 *
 * libSQL, because one client covers both places this runs: a SQLite file on
 * disk during development, and a hosted database over HTTP on a serverless
 * host, where there is no disk to keep a file on. Which one is decided by
 * `DATABASE_URL` alone -- see docs/deployment.md.
 */
const DEFAULT_URL = "file:./data/pocket-ctf.db";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS players (
     id TEXT PRIMARY KEY,
     token_hash TEXT NOT NULL UNIQUE,
     handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
     named INTEGER NOT NULL DEFAULT 0,
     seed TEXT NOT NULL,
     wrong INTEGER NOT NULL DEFAULT 0,
     last_wrong_at INTEGER NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS solves (
     player_id TEXT NOT NULL REFERENCES players(id),
     slug TEXT NOT NULL,
     points INTEGER NOT NULL,
     clues INTEGER NOT NULL,
     first_blood INTEGER NOT NULL DEFAULT 0,
     solved_at INTEGER NOT NULL,
     PRIMARY KEY (player_id, slug)
   )`,
  `CREATE TABLE IF NOT EXISTS clues (
     player_id TEXT NOT NULL REFERENCES players(id),
     slug TEXT NOT NULL,
     taken INTEGER NOT NULL,
     PRIMARY KEY (player_id, slug)
   )`,
  `CREATE TABLE IF NOT EXISTS eggs (
     player_id TEXT NOT NULL REFERENCES players(id),
     egg TEXT NOT NULL,
     found_at INTEGER NOT NULL,
     PRIMARY KEY (player_id, egg)
   )`,
  "CREATE INDEX IF NOT EXISTS solves_by_slug ON solves (slug)",
];

async function open(): Promise<Client> {
  const url = process.env.DATABASE_URL ?? DEFAULT_URL;
  if (url.startsWith("file:")) {
    mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
  }
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  await client.batch(SCHEMA, "write");
  return client;
}

/*
 * Held on globalThis rather than at module scope: the dev server re-evaluates
 * this module on every edit, and each evaluation would otherwise open another
 * handle on the same file.
 */
const holder = globalThis as { pocketCtfDb?: Promise<Client> };

export function db(): Promise<Client> {
  holder.pocketCtfDb ??= open();
  return holder.pocketCtfDb;
}
