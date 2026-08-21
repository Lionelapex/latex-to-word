# Current product (free, live)

Status: **shipped**. Last verified against the repo layout and `index.html` / `package.json` in this workspace.

This is the app users get today. The paid product must **extend** this, not replace the conversion pipeline.

## What it does

Paste ChatGPT / Markdown / LaTeX → live preview → **Download .docx** with **native editable Word equations (OMML)**, or Download HTML.

Conversion is not uploaded. No accounts. Optional **Send error report** emails the pasted document and failed LaTeX to the operator.

## URLs and run

| Item | Value |
| --- | --- |
| Live | https://lionelapex.github.io/latex-to-word/ |
| Repo | https://github.com/Lionelapex/latex-to-word |
| Local | `npm install` then `npm run dev` (usually `http://localhost:5173`) |
| Windows | If PowerShell blocks `npm.ps1`, use `npm.cmd run dev` or `run-dev.bat` |
| Tests | `npm test` (Vitest) |
| Pages | GitHub Actions builds Vite `dist/` with `base: '/latex-to-word/'`. Pages **Source must be GitHub Actions**, not deploy-from-branch (Jekyll serving the repo root breaks CSS/JS). |
| Error reports | Operator inbox `lionelapex@gmail.com` (override with `VITE_ERROR_REPORT_EMAIL`). First send triggers a FormSubmit confirmation email that must be accepted. |

## Stack (do not casually change)

- Vanilla HTML / CSS / JS
- **Tailwind CSS** (via Vite plugin) for app chrome; custom CSS for Word-like preview page
- Vite bundler only
- Runtime: `docx`, `xml-js`
- Preview: native **MathML** from our Math AST (**no KaTeX, no Temml, no MathJax** in the current product)
- Tests: Vitest; DOCX ZIP inspected with JSZip in tests

## Architecture (implemented)

```
Raw paste
  → table normalizer (HTML / TSV / stacked lines → GFM pipes; dedupe ChatGPT math twins)
  → protect code + math delimiters
  → block parser (headings, lists, tables, paragraphs)
  → inline parser (bold/italic, math placeholders)
  → LaTeX parser → Math AST (failed nodes keep source)
  → Document model (source of truth)
       ├─ HTML + MathML preview
       ├─ OMML → .docx
       └─ OMML → .docx / HTML file
```

Never: LaTeX → HTML → Word. Never: equations as images.

## UI today (`index.html`)

- Header: title **LaTeX to Word**, subtitle, privacy line, three-step how-it-works
- Left pane: example dropdown, Smart/Strict mode, Paste / Clear, textarea (autosaved locally; preview updates automatically)
- Right pane: Converted / Warnings / Failed stats (clickable), math issues list, Download .docx / Download again / Download HTML / recent exports, Word-like preview
- Footer: about copy plus **Send error report** (does not show error details)
- Shortcuts: Ctrl+Enter refresh preview; Ctrl+Shift+D download .docx; Ctrl+Shift+H download HTML

## Math delimiters

Priority: `\[ \]`, `$$ $$`, `\( \)`, `$ $`, conservative `[ ]` (not citations/links).

Smart mode (default): obvious undelimited LaTeX (`\frac`, `\sqrt`, `\bar{x}`, Greek, scripts). Strict: delimiters only.

## Known limitations (honest)

- Not full TeX (`\newcommand`, chemistry, TikZ). Unknown math commands still **render** as named operators instead of failing
- Broken LaTeX (unmatched braces) is preserved, not deleted
- **Download .docx** is the authoritative path into Word (native OMML)
- Recent exports (last 5) are cached locally in the browser for Download again
- Error capture (last 50) is silent and local: JS crashes anytime; failed/warning math snapshots when the user downloads or clicks Send error report
- Desktop Word is the acceptance target; Word Online is weaker
- Same download name historically (`latex-to-word.docx`) — **now uses first heading/line** (fallback `latex-to-word.docx`)
- Image → LaTeX OCR is **not** in the current app
- No Convert Selection / Manual mark-as-math mode in the original MVP defer list (confirm in UI before assuming it exists)

## Hard constraints for agents

- Do not add KaTeX or Temml
- Do not add React/Vue/Svelte unless DECISIONS.md says so
- Do not add a backend for conversion
- Do not send paste content to analytics or an AI API
- Error reports stay local unless the user clicks **Send error report** (that click includes the paste and failed math)
