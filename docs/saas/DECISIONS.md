# Decisions

Append-only. Newest at the top.

## 2026-09-10 — Google OAuth via Supabase

- **Decision:** Offer **Continue with Google** through Supabase Auth OAuth. Google Client ID/secret live only in the **Supabase dashboard** (Providers → Google). App still uses anon key only and `signInWithOAuth({ provider: "google" })`.
- **Why:** Users asked for Google sign-in without putting Google secrets in the Vite frontend.
- **Status:** In effect (UI + helper); requires Google provider enabled in Supabase.

## 2026-09-10 — Auth vendor = Supabase; keep Vite

- **Decision:** Use **Supabase Auth** (email + password v1) with `@supabase/supabase-js` in the existing **Vite** app. Do **not** migrate to Next.js for auth. Public env only: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. **service_role** never in the frontend or any `VITE_*` var (server-only later for billing/admin). Converter stays usable logged out until pricing/quotas say otherwise.
- **Why:** Matches architecture (identity in browser via anon key; conversion stays local). Avoids a framework rewrite for tonight’s register/sign-in.
- **Status:** In effect for client auth wiring; see [AUTH.md](AUTH.md).

## 2026-08-28 — Optional presence analytics (no document upload)

- **Decision:** Add optional Cloudflare Worker (`presence-api/`) + client heartbeats for **active user count**, **IP**, and **User-Agent**. No desktop hostname (impossible in browsers). Document content never sent.
- **Why:** Owner requested usage visibility without breaking local conversion.
- **Status:** Implemented; disabled until `VITE_PRESENCE_API_URL` is set and Worker is deployed.

## 2026-08-20 — Living SaaS docs folder

- **Decision:** Create `docs/saas/` as the place we document the paid product and keep updating as we build. Agents should read it first (`AGENTS.md`, `.cursor/rules/project-docs.mdc`).
- **Why:** New chats / new PCs should recover product context from the repo, not from old conversations.
- **Status:** In effect.

## 2026-08 (product, from original spec and implementation)

- **Decision:** Conversion is client-only; Math AST is source of truth; Word export is OMML via `docx`; no KaTeX; vanilla JS + Vite.
- **Why:** Privacy, editable equations, static hosting.
- **Status:** In effect for the live app.

## 2026-08 (SaaS intent, not implemented)

- **Decision:** Subscriptions use a backend for **identity and billing only**. Do not upload paste for conversion.
- **Why:** Keep the privacy claim; Stripe cannot live in the browser.
- **Status:** Planned.

## Open (must decide before coding SaaS)

- Exact Free vs Pro limits and price
- Whether the GitHub Pages site stays unlimited free forever or becomes the marketing/converter with a quota after login
- Additional OAuth providers beyond Google (e.g. GitHub)
