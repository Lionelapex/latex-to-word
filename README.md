# LaTeX to Word

Convert ChatGPT, Markdown, and LaTeX into a Word document with editable equations.

Paste ChatGPT or LaTeX content, click Convert, then download a `.docx` and open it in Microsoft Word. Equations stay editable in Word. Everything runs in your browser.

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

## What it does

- Headings, paragraphs, bold/italic, lists, GFM tables, code, quotes
- Delimited math: `\[ \]`, `$$ $$`, `\( \)`, `$ $`, and conservative `[ ]`
- Smart math detection for obvious undelimited LaTeX (`\frac`, `\sqrt`, `\bar{x}`, Greek, â€¦)
- Preview via native MathML (no KaTeX / MathJax)
- Download `.docx` with native Word equations
- Copy for Word (HTML + MathML, best-effort)

## Windows troubleshooting

PowerShell may block `npm` because it runs `npm.ps1` when script execution is disabled. Use one of these instead:

- **Quick fix:** `npm.cmd run dev` (and `npm.cmd install` for install)
- **Helper script:** `.\run-dev.bat` (double-click or run from cmd/PowerShell)
- **Optional (current user only):** `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

`run-dev.ps1` calls `npm.cmd` through `cmd.exe` for the same reason; if issues persist, use `run-dev.bat`.

## Privacy

No accounts, no API keys, no server. Conversion never uploads your paste.

