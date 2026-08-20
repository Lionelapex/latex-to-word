# LaTeX to Word

Convert ChatGPT, Markdown, and LaTeX into a Word document with editable equations.

Paste ChatGPT or LaTeX content — the preview updates automatically — then download a `.docx` and open it in Microsoft Word. Equations stay editable in Word. Everything runs in your browser.

**Your document is processed locally in your browser.**

## Run

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm test
npm run build
```

## GitHub Pages

The live site is served from the Vite `dist/` build, not the repository root.

1. Open the repo **Settings → Pages**.
2. Set **Source** to **GitHub Actions** (not “Deploy from a branch” / root).
3. Push to `main` (or run the **Deploy GitHub Pages** workflow). The first run must succeed before the site is live.

The workflow builds with `base: '/latex-to-word/'` so assets load at `https://lionelapex.github.io/latex-to-word/`.

## What it does

- Headings, paragraphs, bold/italic, lists, GFM tables, code, quotes
- Delimited math: `\[ \]`, `$$ $$`, `\( \)`, `$ $`, and conservative `[ ]`
- Smart math detection for obvious undelimited LaTeX (`\frac`, `\sqrt`, `\bar{x}`, Greek, â€¦)
- Preview via native MathML (no KaTeX / MathJax)
- Download `.docx` with native Word equations
- Download HTML preview file

## Stack

Vanilla JavaScript converter with **Tailwind CSS** for the app UI (Vite + `docx` + Vitest). Preview equations use native MathML; Word export uses OMML.

## Windows troubleshooting

PowerShell may block `npm` because it runs `npm.ps1` when script execution is disabled. Use one of these instead:

- **Quick fix:** `npm.cmd run dev` (and `npm.cmd install` for install)
- **Helper script:** `.\run-dev.bat` (double-click or run from cmd/PowerShell)
- **Optional (current user only):** `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

`run-dev.ps1` calls `npm.cmd` through `cmd.exe` for the same reason; if issues persist, use `run-dev.bat`.

## Documentation

- **[docs/saas/README.md](docs/saas/README.md)** — living docs for the **current app** and the **planned paid subscription** product (start here in a new Cursor chat)
- [docs/TECH.md](docs/TECH.md) — converter architecture decision record

## Privacy

No accounts, no API keys, no server. Conversion never uploads your paste.

