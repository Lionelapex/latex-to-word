const SESSION_PREFIX = "session:";
const SESSION_TTL_SECONDS = 120;

function corsHeaders(env, request) {
  const origin = request.headers.get("Origin");
  const allowed = env.ALLOWED_ORIGIN || "*";
  const allowOrigin =
    allowed === "*" || !origin
      ? allowed
      : origin === allowed
        ? origin
        : allowed;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function json(data, init = {}, env, request) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders(env, request),
    ...(init.headers || {}),
  };
  return new Response(JSON.stringify(data), { ...init, headers });
}

function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

async function notifyWebhook(env, message) {
  if (!env.WEBHOOK_URL) return;
  try {
    await fetch(env.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  } catch {
    /* ignore webhook failures */
  }
}

async function handleHeartbeat(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 }, env, request);
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId || sessionId.length > 80) {
    return json({ error: "sessionId required" }, { status: 400 }, env, request);
  }

  const key = `${SESSION_PREFIX}${sessionId}`;
  const existingRaw = await env.SESSIONS.get(key);
  const isNew = !existingRaw;
  const existing = existingRaw ? JSON.parse(existingRaw) : null;
  const now = new Date().toISOString();
  const ip = clientIp(request);
  const userAgent = request.headers.get("User-Agent") || "";

  const record = {
    sessionId,
    ip,
    userAgent,
    language: typeof body.language === "string" ? body.language.slice(0, 32) : "",
    timezone: typeof body.timezone === "string" ? body.timezone.slice(0, 64) : "",
    path: typeof body.path === "string" ? body.path.slice(0, 120) : "",
    firstSeen: existing?.firstSeen || now,
    lastSeen: now,
  };

  await env.SESSIONS.put(key, JSON.stringify(record), {
    expirationTtl: SESSION_TTL_SECONDS,
  });

  if (isNew) {
    await notifyWebhook(
      env,
      [
        "New LaTeX to Word visitor",
        `IP: ${ip}`,
        `Browser: ${userAgent.slice(0, 180)}`,
        record.timezone ? `Timezone: ${record.timezone}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return json({ ok: true, activeTtlSeconds: SESSION_TTL_SECONDS }, { status: 200 }, env, request);
}

async function handleAdminStats(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (!env.ADMIN_SECRET || auth !== `Bearer ${env.ADMIN_SECRET}`) {
    return json({ error: "Unauthorized" }, { status: 401 }, env, request);
  }

  const listed = await env.SESSIONS.list({ prefix: SESSION_PREFIX });
  const sessions = [];
  for (const key of listed.keys) {
    const raw = await env.SESSIONS.get(key.name);
    if (raw) sessions.push(JSON.parse(raw));
  }

  sessions.sort((a, b) => String(b.lastSeen).localeCompare(String(a.lastSeen)));

  return json(
    {
      activeCount: sessions.length,
      activeWindowSeconds: SESSION_TTL_SECONDS,
      sessions,
      note: "Desktop/computer name is not available from browsers. IP and User-Agent are logged server-side.",
    },
    { status: 200 },
    env,
    request,
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env, request) });
    }

    if (url.pathname === "/heartbeat" && request.method === "POST") {
      return handleHeartbeat(request, env);
    }

    if (url.pathname === "/admin/stats" && request.method === "GET") {
      return handleAdminStats(request, env);
    }

    if (url.pathname === "/" && request.method === "GET") {
      return json({ service: "latex-to-word-presence", status: "ok" }, { status: 200 }, env, request);
    }

    return json({ error: "Not found" }, { status: 404 }, env, request);
  },
};
