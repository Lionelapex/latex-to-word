# Roadmap

Statuses: **done** / **next (free app)** / **saas** / **later** / **out of scope**.

## Done (free converter)

- Client-side parse → document model → MathML preview + OMML `.docx`
- Tables (GFM, HTML paste, TSV, math-dedupe)
- Structure: headings, lists, display math as own blocks
- GitHub Pages via Vite `dist` + Actions
- Live: https://latextodocx.com/

## Next (still free, no backend) — user-requested pain

These improve daily use **before** subscriptions:

1. Smart `.docx` filenames from first heading/line — **done**
2. Autosave textarea (localStorage) — **done**
3. Example documents for testing — **done**
4. Clickable warnings / failed LaTeX inspection — **done**
5. Re-download last export; optional short local history — **done**
6. ~~Copy-for-Word as first-class with clear fallback to download~~ — **removed** (clipboard paste did not yield editable Word equations)
7. Keyboard shortcuts (download, HTML) — **done**
8. Live auto-convert preview (no manual Convert button) — **done**
9. Silent error capture + **Send error report** to the operator inbox (no client-facing log) — **done**
10. Plain-text math Word export (same .docx structure, math as Unicode, native tables) — **done**

## SaaS (accounts + money)

1. Choose auth + host API (record in DECISIONS.md) — **done** (Supabase Auth + Vite; see [AUTH.md](AUTH.md))
2. Client register / sign-in / sign-out UI (email + password) — **in progress**
3. Stripe Checkout + Portal + webhooks
4. `GET /me` entitlements in the static app
5. Pricing page + quota UX
6. Legal: terms, privacy, refunds
7. Paid UI chrome from [UI-LAYOUT.md](UI-LAYOUT.md) (account, plan badge)
8. GitHub Pages build secrets for `VITE_SUPABASE_*` (same pattern as presence)

## Later

- Image → LaTeX (vendor or self-host; privacy update)
- Word add-in
- Manual / convert selection
- Broader LaTeX coverage
- Custom Word templates

## Out of scope unless decided

- KaTeX / Temml
- Sending documents to an LLM for parsing
- Electron wrapper (can revisit)
