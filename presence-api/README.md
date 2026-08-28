# Presence API (optional)

Lightweight usage telemetry for **LaTeX to Word**. Tracks **how many people are currently using the app** and logs **IP address** and **browser User-Agent** on the server.

## What is collected

| Field | Source |
| --- | --- |
| Anonymous session ID | Random UUID in the browser (`sessionStorage`) |
| IP address | Cloudflare Worker request headers |
| User-Agent | Browser header |
| Language / timezone | Browser (optional) |
| Page path | e.g. `/latex-to-word/` |

**Not collected:** pasted LaTeX, document text, filenames, or exports.

**Not possible:** desktop/computer name. Browsers do not expose the Windows/macOS hostname for security reasons.

## Deploy (Cloudflare Workers)

1. Install Wrangler: `npm install -g wrangler` (or use `npx wrangler`)
2. Create KV namespace: `npx wrangler kv namespace create SESSIONS`
3. Copy the namespace `id` into `wrangler.toml` (`REPLACE_WITH_KV_NAMESPACE_ID`)
4. Set secrets:
   ```bash
   npx wrangler secret put ADMIN_SECRET
   npx wrangler secret put WEBHOOK_URL   # optional: Discord/Slack incoming webhook
   ```
5. Deploy: `npx wrangler deploy`
6. Note the worker URL (e.g. `https://latex-to-word-presence.<account>.workers.dev`)

## Wire the static app

Set at build time:

```bash
VITE_PRESENCE_API_URL=https://latex-to-word-presence.<account>.workers.dev npm run build
```

For GitHub Actions, add repository secret `VITE_PRESENCE_API_URL` and pass it in the Pages workflow.

## View active users

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  https://latex-to-word-presence.<account>.workers.dev/admin/stats
```

Or open `/latex-to-word/admin-presence.html` on the deployed site, enter the API URL and admin secret.

## Webhook notifications

If `WEBHOOK_URL` is set (e.g. Discord webhook), you get a message when a **new session** starts (first visit in that browser tab session).

Active user count = sessions with a heartbeat in the last **120 seconds**.
