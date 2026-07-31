/**
 * The one place this app talks to browser storage.
 *
 * Progress is a few kilobytes of JSON, so `localStorage` is the right size
 * class: synchronous, so there is no flash of empty state on load, and simple
 * enough that nothing here needs a schema.
 *
 * IndexedDB was considered and rejected. It buys capacity and structure this
 * data does not need, and one challenge (`local-records`) teaches players to
 * open the storage panel and read IndexedDB -- keeping progress out of there
 * leaves that puzzle's database unambiguous.
 *
 * None of this is a trust boundary. Tampering with stored progress is pointless
 * because of the proof-of-solve tokens, not because of where they are kept, and
 * nothing written here is a secret: the token and the seal key are both one-way
 * with respect to the flag.
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

let active: StorageAdapter =
  typeof localStorage === "undefined" ? memoryStorage() : browserStorage;

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
