# Decisions

Append-only. Newest at the top.

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

- Auth vendor (Clerk vs Supabase vs Auth0 vs custom)
- Exact Free vs Pro limits and price
- Whether the GitHub Pages site stays unlimited free forever or becomes the marketing/converter with a quota after login
