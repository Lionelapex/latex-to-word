/** Anonymous export trials before sign-in is required. */
export const ANON_EXPORT_LIMIT = 3;

/** localStorage key for anonymous successful export count. */
export const ANON_EXPORT_STORAGE_KEY = "latextodocx-anon-exports";

function defaultStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* private mode / blocked storage */
  }
  return null;
}

function readUsed(storage, key) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    const n = Number.parseInt(String(raw ?? "0"), 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  } catch {
    return 0;
  }
}

function writeUsed(storage, key, count) {
  if (!storage) return;
  try {
    storage.setItem(key, String(Math.max(0, Math.floor(count))));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Gate anonymous downloads after N successful exports.
 * Preview is never gated. Signed-in users are unlimited (free plan for now).
 *
 * @param {{ storage?: Storage | null, limit?: number, key?: string, isSignedIn?: boolean }} [options]
 */
export function createTrialGate(options = {}) {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const limit = options.limit ?? ANON_EXPORT_LIMIT;
  const key = options.key ?? ANON_EXPORT_STORAGE_KEY;
  let signedIn = Boolean(options.isSignedIn);
  const stored = readUsed(storage, key);
  let used = stored == null ? 0 : stored;

  function syncFromStorage() {
    const next = readUsed(storage, key);
    if (next != null) used = next;
  }

  function getUsed() {
    syncFromStorage();
    return used;
  }

  function getRemaining() {
    if (signedIn) return Number.POSITIVE_INFINITY;
    return Math.max(0, limit - getUsed());
  }

  function canExport() {
    return signedIn || getUsed() < limit;
  }

  /**
   * Record one successful export for anonymous users.
   * @returns {{ ok: boolean, remaining: number, used: number }}
   */
  function consumeExport() {
    if (signedIn) {
      return { ok: true, remaining: Number.POSITIVE_INFINITY, used: getUsed() };
    }
    syncFromStorage();
    if (used >= limit) {
      return { ok: false, remaining: 0, used };
    }
    used += 1;
    writeUsed(storage, key, used);
    return { ok: true, remaining: Math.max(0, limit - used), used };
  }

  return {
    setSignedIn(value) {
      signedIn = Boolean(value);
    },
    isSignedIn() {
      return signedIn;
    },
    getLimit() {
      return limit;
    },
    getUsed,
    getRemaining,
    canExport,
    consumeExport,
  };
}
