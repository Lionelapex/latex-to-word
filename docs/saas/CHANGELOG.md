# Changelog (docs and product)

## 2026-09-10

- **Trial gate:** Anonymous users get **3 free downloads** (.docx / plain DOCX / HTML / redownload). Preview stays free. After 3, Sign in required for exports; signed-in free plan is unlimited for now. Usage in `localStorage` via `src/ui/trial-gate.js`. See DECISIONS.md and PRICING.md.
- **SEO:** Stronger meta/OG/Twitter, FAQPage JSON-LD, crawlable How it works + FAQ below the converter, `public/robots.txt` + `public/sitemap.xml`. Documented in [SEO.md](SEO.md).
- **Domain:** Custom domain **https://latextodocx.com/** on GitHub Pages; Vite `base: '/'`; `public/CNAME`. Update Supabase + Google OAuth redirect/origins for the new host.
- **Auth (Supabase):** Documented setup in [AUTH.md](AUTH.md); locked vendor + Vite (no Next.js) in DECISIONS. Client `@supabase/supabase-js` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` only; Sign in / Register / Sign out in the header. No service_role in the frontend.
- **Auth:** **Continue with Google** via Supabase `signInWithOAuth` (Google Client ID/secret stay in the Supabase dashboard, not in `.env`).
- **Database:** Added `supabase/migrations/20260910_profiles.sql` for `public.profiles` + RLS + signup trigger; app `ensureProfile` on sign-in. Harden helper `20260910_profiles_harden.sql` for existing projects.

## 2026-08-28

- **Optional presence API:** Cloudflare Worker + client heartbeats for active user count, IP, and User-Agent (no document upload; desktop name not available in browsers).

## 2026-08-20

- **Free app:** Tailwind CSS UI refresh — responsive layout, polished cards, SEO meta tags and structured data.
- **Free app:** removed Copy for Word (clipboard paste into Word did not produce editable equations reliably).
- **Free app:** live auto-convert preview; smart filenames; draft autosave; example documents; export history; math issues panel.
- Added `docs/saas/` living documentation for the **paid subscription** plan: vision, architecture, UI layout, pricing draft, privacy, roadmap, decisions.
- Added `AGENTS.md` and `.cursor/rules/project-docs.mdc` so new Cursor agents load this folder.

## Earlier (app, summary)

- Free LaTeX to Word converter shipped on GitHub Pages.
- Parser, preview, OMML `.docx`, tables, Smart/Strict modes.
- Pages deploy uses GitHub Actions + Vite `base: '/latex-to-word/'`.
