import { describe, expect, it, vi } from "vitest";
import {
  buildHeartbeatPayload,
  getOrCreateSessionId,
  startPresence,
} from "../../src/analytics/presence.js";

describe("presence analytics", () => {
  it("creates and reuses a session id in sessionStorage", () => {
    const storage = {
      map: new Map(),
      getItem(key) {
        return this.map.get(key) ?? null;
      },
      setItem(key, value) {
        this.map.set(key, value);
      },
    };

    const first = getOrCreateSessionId(storage);
    const second = getOrCreateSessionId(storage);
    expect(first).toBeTruthy();
    expect(second).toBe(first);
  });

  it("builds heartbeat payload without document content", () => {
    const payload = buildHeartbeatPayload("abc-123");
    expect(payload).toEqual({
      sessionId: "abc-123",
      path: expect.any(String),
      language: expect.any(String),
      timezone: expect.any(String),
    });
    expect(payload).not.toHaveProperty("input");
    expect(payload).not.toHaveProperty("document");
  });

  it("does not call fetch when api url is missing", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const handle = startPresence({ apiBase: "" });
    expect(fetchSpy).not.toHaveBeenCalled();
    handle.stop();
    fetchSpy.mockRestore();
  });
});
