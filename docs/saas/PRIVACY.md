# Privacy

## Today (free GitHub Pages app)

**True and required:** pasted content is processed **only in the browser**. No upload of document text for conversion.

Optional **accounts** (when `VITE_SUPABASE_*` is configured): email and auth session go to **Supabase Auth** only. Document paste is still not sent to Supabase. See [AUTH.md](AUTH.md).

UI copy: *Your document is processed locally in your browser.*

## Optional presence analytics (owner)

If the site owner deploys `presence-api/` (Cloudflare Worker) and sets `VITE_PRESENCE_API_URL` at build time, the app sends **anonymous heartbeats** only:

- Random session id (browser tab)
- IP address (read on the server from the request)
- Browser User-Agent, language, timezone, page path

**Not sent:** LaTeX, ChatGPT paste, previews, exports, or filenames.

**Not available:** desktop/computer name (browsers do not expose it).

Owner can view active users via `GET /admin/stats` or `public/admin-presence.html`.

Optional `WEBHOOK_URL` secret can notify the owner when a new session starts.

Do not add analytics that send paste contents.

Crashes are stored **silently on the device**. Clients do not see that log. **Send error report** is always available (opt-in click), even if the converter showed no warning; that click emails the operator the **pasted document**, **failed/warning LaTeX**, and an optional note. Automatic error telemetry is **not** enabled. Conversion still runs locally until the user clicks send.

## After SaaS accounts

Still true **if** we follow [ARCHITECTURE.md](ARCHITECTURE.md) and [AUTH.md](AUTH.md):

- Conversion still local
- Supabase (and later our API) stores email, auth ids, plan, usage counts
- Server does **not** store LaTeX or .docx

Privacy policy must list: **Supabase** (auth), Stripe (payment data on Stripe’s side), hosting.

## If we add image OCR or any server-side parse

We **must** drop or qualify the local-only claim:

- Images (and maybe derived LaTeX) go to our API and/or a vendor
- Retention: delete immediately after OCR unless the user opts into history
- Pro-only, disclosed in UI before upload

## Agent rule

Never implement “save documents in the cloud” without a DECISIONS.md entry and a privacy copy change.
