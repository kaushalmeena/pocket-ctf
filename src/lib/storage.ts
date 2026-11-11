/**
 * The one place this app talks to browser storage.
 *
 * All that is kept here is the theme preference. `localStorage` is the right
 * size class for it: synchronous, so there is no flash of the wrong theme on
 * load.
 *
 * Progress is not here. It lives in the server's database, which is why
 * clearing site data costs a player nothing but their session cookie -- and
 * why nothing stored in the browser is worth tampering with.
 *
 * Going through an adapter means the backend is swappable and tests can drive
 * persistence without a DOM.
 */

export type StorageAdapter = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
};

/**
 * Every call is guarded. Private browsing, a full quota and disabled storage all
 * throw rather than returning something falsy, and none of them should take the
 * page down -- the game still plays, it just will not be there tomorrow.
 */
const browserStorage: StorageAdapter = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* quota, private mode, or storage disabled */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* as above */
    }
  },
};

/** In-memory, for tests and for environments with no storage at all. */
export function memoryStorage(seed: Record<string, string> = {}): StorageAdapter {
  const map = new Map(Object.entries(seed));
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => void map.set(key, value),
    remove: (key) => void map.delete(key),
  };
}

/*
 * Test for a window, not for `localStorage` itself: Node 22+ defines a global
 * `localStorage` whose mere lookup prints an ExperimentalWarning on every
 * server cold start.
 */
let active: StorageAdapter = typeof window === "undefined" ? memoryStorage() : browserStorage;

export const storage: StorageAdapter = {
  get: (key) => active.get(key),
  set: (key, value) => active.set(key, value),
  remove: (key) => active.remove(key),
};

/** Swap the backend. Returns a function that puts the previous one back. */
export function setStorage(next: StorageAdapter) {
  const previous = active;
  active = next;
  return () => {
    active = previous;
  };
}
