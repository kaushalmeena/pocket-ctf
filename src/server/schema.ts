import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Every table, in one place, for Drizzle and drizzle-kit.
 *
 * Two halves. The first four belong to Better Auth: who a visitor is, their
 * sessions, any GitHub account linked to them. Their shape is Better Auth's,
 * plus the `isAnonymous` column its anonymous plugin adds -- change them only
 * to follow Better Auth. The rest are the hunt's, keyed by Better Auth's user
 * id.
 *
 * The hunt's timestamps are epoch milliseconds rather than `timestamp`, because
 * every comparison made against them is arithmetic on `Date.now()`.
 */

/* ------------------------------------------------------------------ *
 * Better Auth
 * ------------------------------------------------------------------ */

const created = () => timestamp("created_at").defaultNow().notNull();
const updated = () =>
  timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: created(),
  updatedAt: updated(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ------------------------------------------------------------------ *
 * The hunt
 * ------------------------------------------------------------------ */

const ms = (name: string) => bigint(name, { mode: "number" });

/**
 * The hunt's view of a player. No foreign key to `user`, on purpose: when an
 * anonymous player claims with GitHub, Better Auth deletes the anonymous user,
 * and this row has to have been moved by then rather than taken with it.
 */
export const players = pgTable(
  "players",
  {
    id: text("id").primaryKey(),
    handle: text("handle").notNull(),
    /** False while the handle is the one the server made up. */
    named: boolean("named").default(false).notNull(),
    /** Decides which variant of each puzzle this player is dealt. */
    seed: text("seed").notNull(),
    createdAt: ms("created_at").notNull(),
  },
  // Handles are unique however they are capitalised.
  (t) => [uniqueIndex("players_handle_idx").on(sql`lower(${t.handle})`)],
);

export const solves = pgTable(
  "solves",
  {
    playerId: text("player_id").notNull(),
    slug: text("slug").notNull(),
    points: integer("points").notNull(),
    clues: integer("clues").notNull(),
    firstBlood: boolean("first_blood").default(false).notNull(),
    solvedAt: ms("solved_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.slug] }), index("solves_slug_idx").on(t.slug)],
);

export const clues = pgTable(
  "clues",
  {
    playerId: text("player_id").notNull(),
    slug: text("slug").notNull(),
    taken: integer("taken").notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.slug] })],
);

/** Secret trophies: things a player did that are not flags. */
export const eggs = pgTable(
  "eggs",
  {
    playerId: text("player_id").notNull(),
    egg: text("egg").notNull(),
    foundAt: ms("found_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.egg] })],
);

/** Wrong-answer counts, per player and per address. See throttle.ts. */
export const throttle = pgTable("throttle", {
  key: text("key").primaryKey(),
  wrong: integer("wrong").notNull(),
  lastAt: ms("last_at").notNull(),
});
