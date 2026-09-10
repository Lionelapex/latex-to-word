import { describe, expect, it, beforeEach } from "vitest";
import {
  ANON_EXPORT_LIMIT,
  ANON_EXPORT_STORAGE_KEY,
  createTrialGate,
} from "../../src/ui/trial-gate.js";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

describe("createTrialGate", () => {
  let storage;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it("gives anonymous users the full trial limit", () => {
    const gate = createTrialGate({ storage, isSignedIn: false });
    expect(ANON_EXPORT_LIMIT).toBe(3);
    expect(gate.getRemaining()).toBe(3);
    expect(gate.canExport()).toBe(true);
    expect(gate.getUsed()).toBe(0);
  });

  it("consumes one trial per successful anonymous export", () => {
    const gate = createTrialGate({ storage, isSignedIn: false });
    expect(gate.consumeExport()).toEqual({ ok: true, remaining: 2, used: 1 });
    expect(gate.consumeExport()).toEqual({ ok: true, remaining: 1, used: 2 });
    expect(gate.consumeExport()).toEqual({ ok: true, remaining: 0, used: 3 });
    expect(gate.canExport()).toBe(false);
    expect(gate.consumeExport()).toEqual({ ok: false, remaining: 0, used: 3 });
    expect(storage.getItem(ANON_EXPORT_STORAGE_KEY)).toBe("3");
  });

  it("persists usage across gate instances sharing storage", () => {
    const first = createTrialGate({ storage, isSignedIn: false });
    first.consumeExport();
    first.consumeExport();
    const second = createTrialGate({ storage, isSignedIn: false });
    expect(second.getUsed()).toBe(2);
    expect(second.getRemaining()).toBe(1);
  });

  it("does not consume or block when signed in", () => {
    const gate = createTrialGate({ storage, isSignedIn: false });
    gate.consumeExport();
    gate.consumeExport();
    gate.consumeExport();
    expect(gate.canExport()).toBe(false);

    gate.setSignedIn(true);
    expect(gate.canExport()).toBe(true);
    expect(gate.getRemaining()).toBe(Number.POSITIVE_INFINITY);
    expect(gate.consumeExport()).toEqual({
      ok: true,
      remaining: Number.POSITIVE_INFINITY,
      used: 3,
    });
    expect(storage.getItem(ANON_EXPORT_STORAGE_KEY)).toBe("3");
  });

  it("unlocks immediately when auth flips to signed in", () => {
    const gate = createTrialGate({ storage, isSignedIn: false });
    while (gate.canExport()) gate.consumeExport();
    expect(gate.canExport()).toBe(false);
    gate.setSignedIn(true);
    expect(gate.canExport()).toBe(true);
  });

  it("treats invalid stored values as zero", () => {
    storage.setItem(ANON_EXPORT_STORAGE_KEY, "nope");
    const gate = createTrialGate({ storage, isSignedIn: false });
    expect(gate.getUsed()).toBe(0);
    expect(gate.getRemaining()).toBe(3);
  });

  it("counts in memory when storage is null", () => {
    const gate = createTrialGate({ storage: null, isSignedIn: false });
    expect(gate.getRemaining()).toBe(3);
    expect(gate.consumeExport()).toEqual({ ok: true, remaining: 2, used: 1 });
    expect(gate.consumeExport()).toEqual({ ok: true, remaining: 1, used: 2 });
    expect(gate.consumeExport()).toEqual({ ok: true, remaining: 0, used: 3 });
    expect(gate.canExport()).toBe(false);
  });
});
