import {
  type Accessor,
  createContext,
  createEffect,
  createSignal,
  type JSX,
  useContext,
} from "solid-js";

import { claimSecret, sendLine, setHandle } from "./api";
import type { Me, Reply, Trophy } from "./types";

/**
 * What the browser knows about the hunt: who the player is, how they stand,
 * and which trophies are waiting to be shown.
 *
 * Deliberately thin. There is no list of challenges here and no solve state to
 * guard -- the server keeps both, and this only mirrors what it last said.
 */

export type Toast = Trophy & { id: number };

type Game = {
  me: Accessor<Me>;
  /** Trophies queued for the corner of the screen, oldest first. */
  toasts: Accessor<Toast[]>;
  award: (trophies: Trophy[]) => void;
  dismiss: (id: number) => void;
  /** Send a line from the prompt: a flag, or anything else. */
  send: (input: string) => Promise<Reply>;
  /** Ask for a secret trophy the browser noticed the player earning. */
  claim: (secret: string) => Promise<void>;
  /** Returns what was wrong with the handle, or null. */
  rename: (handle: string) => Promise<string | null>;
  sync: (me: Me) => void;
};

const Ctx = createContext<Game>();

let nextId = 1;

export function GameProvider(props: { initial: Accessor<Me>; children: JSX.Element }) {
  const [me, setMe] = createSignal<Me>(props.initial());
  const [toasts, setToasts] = createSignal<Toast[]>([]);

  // The root loader re-runs on navigation; follow whatever it last reported.
  createEffect(() => setMe(props.initial()));

  const award = (trophies: Trophy[]) => {
    if (trophies.length === 0) return;
    setToasts((queue) => [...queue, ...trophies.map((t) => ({ ...t, id: nextId++ }))]);
  };

  const dismiss = (id: number) => setToasts((queue) => queue.filter((t) => t.id !== id));

  const send = async (input: string) => {
    const reply = await sendLine({ data: input });
    setMe(reply.me);
    award(reply.trophies);
    return reply;
  };

  const claim = async (secret: string) => {
    const result = await claimSecret({ data: secret });
    setMe(result.me);
    award(result.trophies);
  };

  const rename = async (handle: string) => {
    const result = await setHandle({ data: handle });
    setMe(result.me);
    return result.error;
  };

  return (
    <Ctx.Provider value={{ me, toasts, award, dismiss, send, claim, rename, sync: setMe }}>
      {props.children}
    </Ctx.Provider>
  );
}

export function useGame() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}
