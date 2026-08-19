# Math-to-Word technical decisions

> **Note:** For day-to-day contributor documentation (folder layout, data flow, tests, extending the parser), see **[DEVELOPER.md](DEVELOPER.md)**. This file is the MVP-0 architecture **decision record** — rationale and rejected alternatives — not a full developer manual.

This document records the architecture chosen for the client-only ChatGPT-to-Word converter. It is the MVP-0 decision record.

## Verdict

Native OMML equations are feasible in the browser. The conversion spine is a custom Math AST plus the `docx` library. Preview is native MathML from that AST. KaTeX, Temml, and MathJax are not used in MVP.

## Architecture

The document model is the source of truth. Preview, clipboard, and DOCX are independent renderers.

```
Raw paste
  → protect fenced/inline code, then math delimiters
  → block parser (headings, paragraphs, lists, tables, quotes, rules, code)
  → inline parser (text, emphasis, code, math placeholders)
  → LaTeX parser (Math AST, or a failed node that keeps the source)
  → Document Model
       → HTML/MathML preview
       → OMML → DOCX
       → clipboard HTML + plain text
```

Never convert LaTeX → HTML → Word. Never export equations as images.

## Libraries

| Role | Choice | Why |
| --- | --- | --- |
| DOCX + OMML packaging | `docx` (dolanmiu) | Browser `Packer.toBlob()`, headings/lists/tables, native `Math*` classes |
| Bundler | Vite | Static site; not a UI framework |
| Tests | Vitest | Parser, OMML XML structure, DOCX zip/XML smoke tests |
| OMML gaps (`\hat`, matrices, `\prod`) | `ImportedXmlComponent` | Raw OMML injection; no MathML round-trip |

**Rejected:** KaTeX, Temml (KaTeX fork), MathJax as parser, markdown-it/marked (emit HTML), `mathml2omml` as the primary path, `@office-open/docx` (too new), any AI API, any server.

## Math delimiters (after code protection)

1. `\[ ... \]` display (ChatGPT copy format)
2. `$$ ... $$` display
3. `\( ... \)` inline
4. `$ ... $` inline (skip currency-like `$123`)
5. `[ ... ]` display only if conservative heuristics pass (math-like / own-line; not Markdown links, footnotes, or `[1]` citations)

## Preview

Native MathML Core from the Math AST (`createElement` / `textContent`; no unsanitized `innerHTML`). MathJax is allowed later as a **preview fallback for failed nodes only**, never as the Word path.

## Privacy

The app is entirely client-side. User content does not leave the browser. The UI states: "Your document is processed locally in your browser."

## Failed LaTeX

Unknown or malformed expressions become `failed` nodes that preserve the original source. They are never deleted. Status counts: Converted / Warnings / Failed.

## Acceptance target

Desktop Microsoft Word. Generated equations must be editable OMML (`m:oMath` / `m:oMathPara`), not images. Clipboard HTML+MathML is best-effort; Download .docx is authoritative.
