# LaTeX to Word

Convert ChatGPT, Markdown, and LaTeX into a Word document with **editable equations**.

**Live demo:** [https://lionelapex.github.io/latex-to-word/](https://lionelapex.github.io/latex-to-word/)  
**Repository:** [https://github.com/Lionelapex/latex-to-word](https://github.com/Lionelapex/latex-to-word)

Everything runs in your browser. Your content is never uploaded to a server.

## Quick start

1. **Paste** ChatGPT output, Markdown, or LaTeX into the input box (Ctrl+V or **Paste from Clipboard**).
2. **Convert** — click **Convert** or press Ctrl+Enter. Preview and conversion stats appear on the right.
3. **Download** — click **Download .docx** and open the file in Microsoft Word.

For step-by-step usage, math delimiters, tables, and troubleshooting, see the [User Guide](docs/USER_GUIDE.md).

## Features

- Headings, paragraphs, **bold** / *italic*, bullet and numbered lists, block quotes, horizontal rules, fenced code
- GFM-style tables (pipe syntax or pasted HTML/tab-separated tables)
- LaTeX math with multiple delimiter styles (see below)
- **Smart** math detection for obvious undelimited LaTeX (`\frac`, `\sqrt`, `\bar{x}`, Greek letters, subscripts)
- Live preview using native **MathML** (no KaTeX or MathJax)
- **Download .docx** with native Word OMML equations (editable in Word)
- **Copy for Word** — HTML + MathML clipboard export (best-effort)
- **Download HTML** — standalone HTML file with MathML preview
- Conversion stats: Converted / Warnings / Failed (click Failed or Warnings to highlight problem math)

## Supported input

| Source | Notes |
| --- | --- |
| **ChatGPT** | Use the copy button on a response; output usually includes `\[...\]` and `\(...\)` delimiters. |
| **Markdown** | Headings (`#`), lists, emphasis, code fences, GFM tables. |
| **LaTeX delimiters** | `\[ \]` and `$$ $$` (display), `\( \)` and `$ $` (inline), conservative `[ ... ]` when math-like. |
| **Tables** | Pipe tables, or paste HTML/tab-separated tables — the app normalizes them to Markdown pipes. |
| **Smart detection** | In **Smart** mode, undelimited snippets like `\bar{x}` or `\frac{a}{b}` are treated as inline math. Use **Strict** to only honor explicit delimiters. |

## Supported LaTeX (summary)

The custom LaTeX parser covers common school and statistics notation:

- Fractions (`\frac`, `\dfrac`, `\tfrac`), roots (`\sqrt`, `\sqrt[n]{…}`)
- Subscripts, superscripts, `\text{…}`, `\mathrm{…}`
- Greek letters and common symbols (`\neq`, `\leq`, `\infty`, `\sum`, `\int`, arrows, set symbols, …)
- Accents: `\bar`, `\hat`, `\vec`, `\tilde`, `\dot`, `\ddot`
- Functions: `\sin`, `\cos`, `\log`, `\ln`, `\exp`, etc.
- Sums, products, integrals with limits (`\sum`, `\prod`, `\int`, `\lim`)
- Delimiters via `\left`/`\right`, `\binom`, `\choose`
- Matrices: `\begin{pmatrix}`, `bmatrix`, `vmatrix`, `Bmatrix`, and generic `matrix` environments

Unknown or malformed expressions become **failed** nodes: the original source is preserved and shown in the preview, never silently dropped.

## Limitations

- **Target:** desktop **Microsoft Word**. Equations are OMML (`m:oMath`), not images — but layout may differ slightly from LaTeX PDF output.
- **Not a full TeX engine** — exotic packages, `\newcommand`, align environments, `\ce` chemistry, TikZ, and most AMS-only macros are unsupported.
- **Smart mode heuristics** can miss rare undelimited math or, rarely, mis-detect text; use **Strict** mode when you only want explicit delimiters.
- **Copy for Word** is best-effort; **Download .docx** is the reliable path into Word.
- **Preview** uses browser MathML; a few constructs render via OMML XML injection and may look different in preview vs Word.
- **Bracket math** `[ ... ]` is conservative — citations like `[1]`, links, and non-math brackets are skipped.
- **Dollar math** skips empty or purely numeric amounts that look like currency when appropriate.

## Local development

Requires [Node.js](https://nodejs.org/) (LTS recommended).

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

On Windows, if PowerShell blocks `npm`, use `npm.cmd run dev` or double-click **`run-dev.bat`**. See [User Guide — Troubleshooting](docs/USER_GUIDE.md#troubleshooting).

```bash
npm test          # run Vitest once
npm run test:watch
npm run build     # production build to dist/
npm run preview   # serve dist/ locally
```

Contributors: see [Developer Guide](docs/DEVELOPER.md).

## GitHub Pages deployment

The live site is the Vite **`dist/`** build, deployed by GitHub Actions — not the repository root.

1. Repo **Settings → Pages** → **Source:** **GitHub Actions**.
2. Push to `main` (or run the **Deploy GitHub Pages** workflow).

The app is built with `base: '/latex-to-word/'` so assets load at  
`https://lionelapex.github.io/latex-to-word/`.

## Privacy

No accounts, no API keys, no backend. Parsing, preview, and `.docx` generation happen entirely in your browser. Content you paste never leaves your device.

## License

MIT — see [LICENSE](LICENSE) (to be added; project dependencies use permissive licenses).

## Documentation

- [User Guide](docs/USER_GUIDE.md) — copying from ChatGPT, paste methods, export options, FAQ
- [Developer Guide](docs/DEVELOPER.md) — architecture, modules, tests, extending the parser
- [TECH.md](docs/TECH.md) — MVP architecture decision record
