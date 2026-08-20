# Roadmap

Statuses: **done** / **next (free app)** / **saas** / **later** / **out of scope**.

## Done (free converter)

- Client-side parse → document model → MathML preview + OMML `.docx`
- Tables (GFM, HTML paste, TSV, math-dedupe)
- Structure: headings, lists, display math as own blocks
- GitHub Pages via Vite `dist` + Actions
- Live: https://lionelapex.github.io/latex-to-word/

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

## SaaS (accounts + money)

1. Choose auth + host API (record in DECISIONS.md)
2. Stripe Checkout + Portal + webhooks
3. `GET /me` entitlements in the static app
4. Pricing page + quota UX
5. Legal: terms, privacy, refunds
6. Paid UI chrome from [UI-LAYOUT.md](UI-LAYOUT.md) (account, plan badge)

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
