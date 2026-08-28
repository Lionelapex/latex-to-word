# User Guide — LaTeX to Word

This guide explains how to use the [LaTeX to Word](https://lionelapex.github.io/latex-to-word/) app: pasting content from ChatGPT, converting math and tables, and getting the result into Microsoft Word.

## Overview

LaTeX to Word is a browser-only tool. You paste text that contains Markdown and/or LaTeX math, convert it, preview the result, then export to Word. No sign-in, no upload — everything stays on your computer.

**Typical workflow:** Paste → Convert → Download `.docx` → Open in Word.

---

## Copying from ChatGPT

### Copy button (recommended)

1. In ChatGPT, click the **Copy** button on a response (not “Copy code” unless you only want a code block).
2. ChatGPT usually exports Markdown with math delimiters:
   - Display math: `\[ ... \]` or `$$ ... $$`
   - Inline math: `\( ... \)` or `$ ... $`
3. Paste into the app input box and click **Convert**.

This path preserves headings, lists, and tables when ChatGPT formatted them as Markdown.

### Selecting text manually

If you highlight and copy part of a response:

- **Tables:** Selecting a table in the ChatGPT UI often puts an HTML `<table>` on the clipboard. Pasting into the app’s textarea triggers table normalization (see [Tables](#tables)).
- **Math:** Prefer copying whole blocks that include delimiters. Raw `\frac{a}{b}` without delimiters still works in **Smart** mode (see below).
- **Plain text only:** If the browser only receives plain text, tab-separated table cells are still detected and converted to pipe tables when possible.

---

## Pasting into the app

### Ctrl+V (or Cmd+V on Mac)

Click in the input textarea and paste. The app:

- Normalizes line endings and non-breaking spaces
- Intercepts HTML clipboard data when it contains a table, converting it to GFM pipe Markdown before insertion
- Leaves ordinary text paste unchanged

### Paste from Clipboard button

Click **Paste from Clipboard** to read the system clipboard via the Clipboard API, replace the entire input, and run **Convert** automatically.

If the browser denies clipboard access, paste manually with Ctrl+V instead.

### Clear

**Clear** empties the input, preview, stats, and any notice banner.

---

## Converting and preview

1. Choose **Math detection** mode (see [Smart vs Strict](#smart-vs-strict-mode)).
2. Click **Convert** or press **Ctrl+Enter** (Cmd+Enter on Mac).
3. The right pane shows a live preview styled like a Word page.
4. Stats appear above the preview:
   - **Converted** — math parsed successfully
   - **Warnings** — parsed but contains partial failures inside a larger expression
   - **Failed** — could not parse; original LaTeX is shown highlighted

Click **Warnings** or **Failed** to scroll to and highlight problem math in the preview.

Preview uses your browser’s native **MathML** rendering. It is a guide; Word may layout equations slightly differently.

---

## Export options

### Download .docx (recommended)

**Download .docx** builds a Word file with native **OMML** equations — editable equation objects in Microsoft Word, not images.

This is the most reliable way to get content into Word.

### Copy for Word

**Copy for Word** puts HTML (with MathML) and plain text on the clipboard. You can paste into Word or other apps.

- Success depends on browser and Word version.
- The app shows a notice reminding you that **Download .docx** remains the authoritative export.
- If clipboard permission fails, use **Download .docx** instead.

### Download HTML

**Download HTML** saves a standalone `.html` file with the same preview content. Useful for archiving or viewing outside Word.

---

## Math delimiters

After protecting code blocks and inline code, the app recognizes math in this order:

| Delimiter | Type | Example |
| --- | --- | --- |
| `\[ ... \]` | Display | ChatGPT default for block equations |
| `$$ ... $$` | Display | Common LaTeX / Markdown |
| `\( ... \)` | Inline | ChatGPT default for inline math |
| `$ ... $` | Inline | Skips empty spans; allows simple numeric math |
| `[ ... ]` | Display (heuristic) | Only when content looks math-like and is not a citation `[1]`, link, or URL |

**Code is protected first** — math inside `` `backticks` `` or fenced ``` code blocks ``` is not converted.

### Inline vs display

- **Display** math is centered on its own line in preview and Word.
- **Inline** math flows within a paragraph or table cell.

---

## Tables

The app accepts:

1. **GFM pipe tables** — already in Markdown:
   ```markdown
   | Column A | Column B |
   | -------- | -------- |
   | $x$      | $y$      |
   ```
2. **HTML tables** — copied from ChatGPT or a web page (clipboard `text/html`).
3. **Tab- or line-separated plain text** — when browsers flatten a table to tabs or one cell per line.

On paste, HTML and plain-table shapes are normalized to pipe Markdown so the preview and Word export both see real rows and columns. Math inside cells is parsed like inline math elsewhere.

---

## Smart vs Strict mode

Use the **Math detection** dropdown before converting.

### Smart (default)

Finds **undelimited** LaTeX that looks obviously mathematical:

- Known commands: `\frac`, `\sqrt`, `\sum`, `\bar`, `\hat`, Greek letters, etc.
- Simple subscripts/superscripts: `x_i`, `n^2`
- Absorbs trailing relation tails like `= 1.135` after `\bar{x}`

**Skips** Windows paths (`C:\Users\...`), ordinary words with underscores, and citation-style `[1]`.

### Strict

Only math inside **explicit delimiters** (`\[ \]`, `$$`, `\( \)`, `$ $`, or heuristic `[ ]`) is converted. Plain `\bar{x}` in running text stays literal text.

Use Strict when Smart mode picks up text you did not intend as math.

---

## Troubleshooting

### Word won’t open the .docx or equations look wrong

- Open the file in **desktop Microsoft Word** (Windows or Mac). Word Online and some third-party viewers do not fully support OMML.
- Prefer **Download .docx** over **Copy for Word** for complex documents.
- Check **Failed** / **Warnings** stats — fix or wrap problematic LaTeX in delimiters and convert again.

### npm / Node on Windows

PowerShell may block `npm` because it runs `npm.ps1` when script execution is disabled.

**Fixes (pick one):**

- `npm.cmd install` and `npm.cmd run dev`
- Double-click or run **`run-dev.bat`** from the project folder
- Optional (current user):  
  `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

The helper script `run-dev.ps1` also calls `npm.cmd` via `cmd.exe`; if issues persist, use `run-dev.bat`.

### Clipboard paste or “Copy for Word” fails

- Grant clipboard permission when the browser prompts.
- Use Ctrl+V into the textarea instead of **Paste from Clipboard**.
- Fall back to **Download .docx**.

### GitHub Pages shows an old version

- Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac).
- Pages deploys from the latest successful **Deploy GitHub Pages** workflow on `main`; allow a minute after a push.
- Confirm you are visiting  
  [https://lionelapex.github.io/latex-to-word/](https://lionelapex.github.io/latex-to-word/)  
  (trailing path matters for assets).

### Math not detected

- Wrap expressions in `\( ... \)` or `$ ... $` for inline, `\[ ... \]` or `$$ ... $$` for display.
- Switch to **Smart** mode if LaTeX has no delimiters.
- Switch to **Strict** if too much text is treated as math.

### Table pasted as plain lines

- Copy the table again from the source UI so HTML is on the clipboard, or paste into the app directly (not via an intermediate plain-text editor).
- Alternatively, format as pipe Markdown manually.

---

## FAQ

**Does my content leave my browser?**  
No. All parsing and export run locally in JavaScript.

**Do I need LaTeX installed?**  
No. The app includes its own LaTeX math parser.

**Why not use KaTeX or MathJax?**  
Preview uses native MathML from an internal AST so the same structure drives Word OMML export. External renderers are not used in the conversion path.

**Can I use Google Docs?**  
The app targets Microsoft Word OMML. Google Docs may not preserve editable equations from `.docx` or clipboard HTML.

**What happens to unsupported LaTeX?**  
It appears as a **failed** node with the original source visible in preview and as plain text in Word — never silently removed.

**Can I edit equations in Word after export?**  
Yes, for successfully converted math. Double-click an equation in Word to open the equation editor.

**Is there an API?**  
No. The app is a static client-side site.

---

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl+Enter (Cmd+Enter) | Convert |

---

For architecture and contributing, see the [Developer Guide](DEVELOPER.md).
