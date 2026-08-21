# Decisions

Append-only. Newest at the top.

## 2026-08-21 — Send error report only when there is a warning or error

- **Decision:** The **Send error report** button is enabled only if the current convert has failed/warning math, or a crash was captured. Clean documents cannot send a report.
- **Why:** Avoid empty inbox noise; the operator only wants real conversion problems.
- **Status:** In effect.

## 2026-08-21 — Error reports include failed LaTeX and the pasted document

- **Decision:** When the user clicks **Send error report**, the email includes the **full pasted text** and every **failed/warning math source**. Silent on-device capture still does not auto-upload. Conversion remains local until that click.
- **Why:** The operator cannot fix parser failures from a stack trace alone; the actual LaTeX is required.
- **Status:** In effect.

## 2026-08-21 — Operator inbox for Send error report

- **Decision:** Default destination is `lionelapex@gmail.com`. `VITE_ERROR_REPORT_EMAIL` can override it.
- **Why:** The operator named that inbox; GitHub Pages has no backend of our own.
- **Status:** In effect.

## 2026-08-21 — Send error reports to the operator, not the client

- **Decision:** Keep capturing crashes and failed math **silently** in the browser. Clients do **not** see an error log. One footer button, **Send error report**, emails a sanitized report to the operator via FormSubmit. Destination is `VITE_ERROR_REPORT_EMAIL` (GitHub Actions secret / local `.env`), not a public GitHub issue. Reports may include **truncated math snippets**, never the full document. Conversion still does not upload paste.
- **Why:** The operator needs real-use failures in their inbox; users should not have to inspect or understand diagnostics.
- **Status:** ~~In effect.~~ Same-day update: user-clicked send now includes failed LaTeX and the full paste; conversion is still not uploaded automatically.

## 2026-08-21 — Local error log, no automatic upload

- **Decision:** Save converter crashes and failed/warning math **in the browser** (IndexedDB). Do **not** auto-upload paste, .docx, or error reports. Users can download/copy a report, or open a GitHub issue themselves. Reports may include **truncated math snippets**, never the full document.
- **Why:** We need a way to keep errors from real use without breaking the local-only privacy claim. GitHub Pages has no backend to receive telemetry.
- **Status:** ~~In effect.~~ Replaced the same day by operator-inbox send (button still user-initiated; no auto-upload of documents).

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
