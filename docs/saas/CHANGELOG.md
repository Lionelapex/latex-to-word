# Changelog (docs and product)

## 2026-08-21

- **Free app:** **Download .docx (plain text)** (`#btn-docx-plain`, Ctrl+Shift+T) is a Word document: headings, lists, and native tables stay Word objects; LaTeX math is converted to Unicode text instead of OMML.
- **Free app:** unknown math commands now render (as named operators / functions) instead of becoming Failed/Warning; added common AMS arrows, relations, n-ary ops, and font commands (`\mathbb`, `\mathbf`, …).
- **Free app:** parse `\implies`, `\impliedby`, `\iff`, and long arrows so ChatGPT calculus steps no longer warn as unknown commands.
- **Free app:** **Send error report** is enabled only when the convert has a warning, a failed equation, or a captured crash.

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
