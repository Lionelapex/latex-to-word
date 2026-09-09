const SESSION_KEY = "latex-to-word:presence-session";
const HEARTBEAT_MS = 45_000;

export function getOrCreateSessionId(storage = sessionStorage) {
  try {
    let id = storage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      storage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function buildHeartbeatPayload(sessionId, win = globalThis.window) {
  let timezone = "";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    timezone = "";
  }
  return {
    sessionId,
    path: win?.location?.pathname || "",
    language: win?.navigator?.language || "",
    timezone,
  };
}

export function startPresence(options = {}) {
  const apiBase = options.apiBase ?? import.meta.env.VITE_PRESENCE_API_URL ?? "";
  if (!apiBase) {
    return { stop() {} };
  }

  const sessionId = getOrCreateSessionId();
  let stopped = false;
  let timer = null;

  const sendHeartbeat = () => {
    if (stopped) return;
    const url = `${apiBase.replace(/\/$/, "")}/heartbeat`;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildHeartbeatPayload(sessionId)),
      keepalive: true,
    }).catch(() => {
      /* optional telemetry; ignore network errors */
    });
  };

  sendHeartbeat();
  timer = setInterval(sendHeartbeat, HEARTBEAT_MS);

  const onVisible = () => {
    if (document.visibilityState === "visible") sendHeartbeat();
  };
  document.addEventListener("visibilitychange", onVisible);

  const stop = () => {
    stopped = true;
    if (timer) clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };

  return { stop, sessionId };
}
