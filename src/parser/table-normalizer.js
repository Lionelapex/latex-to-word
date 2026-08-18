/**
 * Normalize copied tables into GFM Markdown so the block parser, preview,
 * and DOCX exporter all see real rows/columns.
 *
 * ChatGPT (and similar UIs) often put a real HTML <table> on the clipboard.
 * Pasting into a <textarea> only receives text/plain, which browsers flatten
 * to tabs or one cell per line — never `| col | col |`.
 */

const FENCE_RE = /^[ \t]*```/;
const HEADING_RE = /^(#{1,6})[ \t]+/;
const HR_RE = /^(?:\*\s*){3,}$|^(?:-\s*){3,}$|^(?:_\s*){3,}$/;
const UL_RE = /^([ \t]*)([-*+•‣◦▪●∙])[ \t]+/;
const OL_RE = /^([ \t]*)(\d+)[.)][ \t]+/;
const BLOCKQUOTE_RE = /^>/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const SECTION_TITLE_RE = /^\d+(\.\d+)+\s+[A-Z].{6,}$/;

const HEADER_LEXICON = new Set([
  "question",
  "description",
  "symbol",
  "value",
  "expression",
  "variable",
  "formula",
  "definition",
  "meaning",
  "parameter",
  "estimate",
  "note",
  "notes",
  "unit",
  "name",
  "type",
  "outcome",
  "probability",
  "event",
  "sample",
  "population",
  "statistic",
  "notation",
  "interpretation",
  "observation",
  "column",
  "item",
  "term",
  "property",
  "condition",
  "result",
  "explanation",
  "comment",
  "example",
  "measurement",
  "hypothesis",
  "test",
  "mean",
  "median",
  "mode",
  "variance",
  "deviation",
  "distribution",
  "weight",
  "data",
  "count",
  "frequency",
  "relative",
  "cumulative",
  "class",
  "interval",
  "source",
  "category",
  "group",
  "level",
  "factor",
  "response",
  "coefficient",
  "intercept",
  "rank",
  "score",
  "range",
  "minimum",
  "maximum",
]);

export function normalizePastedContent({ html = "", text = "" } = {}) {
  const plain = String(text ?? "");
  const rich = String(html ?? "");
  if (hasHtmlTable(rich) && !hasGfmTable(plain)) {
    try {
      const fromHtml = htmlToMarkdown(rich).replace(/^\s+|\s+$/g, "");
      if (hasGfmTable(fromHtml)) return fromHtml;
    } catch {
      // Fall through to plain-text reconstruction.
    }
  }
  return normalizePlainTableSource(plain);
}

export function hasHtmlTable(html) {
  return /<table\b/i.test(String(html ?? ""));
}

export function hasGfmTable(text) {
  const lines = normalizeNewlines(text).split("\n");
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (isGfmTableStart(lines, i)) return true;
  }
  return false;
}

export function htmlToMarkdown(html) {
  let work = stripClipboardWrapper(String(html ?? ""));
  work = rewriteMathHtml(work);

  const tables = [];
  work = work.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (tableHtml) => {
    const token = `\n\n\uE010${tables.length}\uE011\n\n`;
    tables.push(htmlTableToGfm(tableHtml));
    return token;
  });

  work = htmlBlocksToMarkdown(work);
  work = decodeEntities(work);
  work = work.replace(/\uE010(\d+)\uE011/g, (_, index) => tables[Number(index)] || "");
  work = work
    .split("\n")
    .map((line) => dedupeDuplicatedMath(line))
    .join("\n");
  return collapseBlankLines(work).trim();
}

export function htmlTableToGfm(tableHtml) {
  const parsed = parseHtmlTable(tableHtml);
  if (!parsed) return "";
  return toGfm(parsed.header, parsed.rows);
}

export function normalizePlainTableSource(input) {
  const lines = normalizeNewlines(input).split("\n");
  const out = [];
  let i = 0;
  let inFence = false;

  while (i < lines.length) {
    const line = lines[i];
    if (FENCE_RE.test(line.trim())) {
      inFence = !inFence;
      out.push(line);
      i += 1;
      continue;
    }
    if (inFence) {
      out.push(line);
      i += 1;
      continue;
    }

    if (isGfmTableStart(lines, i)) {
      const end = consumeGfmTable(lines, i);
      out.push(...rewriteGfmTableLines(lines.slice(i, end)));
      i = end;
      continue;
    }

    const loose = tryConsumeLooseTable(lines, i);
    if (loose) {
      out.push(loose.markdown);
      i = loose.next;
      continue;
    }

    out.push(dedupeDuplicatedMath(line));
    i += 1;
  }

  return out.join("\n");
}

function tryConsumeLooseTable(lines, i) {
  const run = collectRun(lines, i);
  if (run.lines.length < 2) return null;

  const maxSkip = Math.min(2, run.lines.length - 2);
  for (let skip = 0; skip <= maxSkip; skip += 1) {
    const slice = run.lines.slice(skip);
    const found = tryTsvTable(slice) || tryPipeTable(slice) || tryPipeHeaderStacked(slice) || tryStackedTable(slice);
    if (!found) continue;
    const prefix = run.lines.slice(0, skip);
    const markdown = [...prefix, found].filter((part) => part !== "").join("\n");
    return { next: run.next, markdown };
  }
  return null;
}

function collectRun(lines, start) {
  const collected = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) break;
    if (FENCE_RE.test(trimmed) || HEADING_RE.test(trimmed) || HR_RE.test(trimmed)) break;
    if (BLOCKQUOTE_RE.test(line) || UL_RE.test(line) || OL_RE.test(line)) break;
    if (SECTION_TITLE_RE.test(trimmed)) break;
    collected.push(line);
    i += 1;
  }
  return { lines: collected, next: i };
}

function tryTsvTable(lines) {
  if (lines.length < 2) return null;
  const rows = lines.map((line) => line.split("\t").map((cell) => cell.trim()));
  if (rows.some((row) => row.length < 2)) return null;
  const cols = rows[0].length;
  if (cols < 2) return null;
  if (!rows.every((row) => row.length === cols)) return null;
  if (isSepRow(rows[0])) return null;
  return toGfm(rows[0], rows.slice(1));
}

function tryPipeTable(lines) {
  if (lines.length < 2) return null;
  if (!lines[0].includes("|")) return null;
  if (TABLE_SEP_RE.test(lines[1])) return null;

  const rows = [];
  for (const line of lines) {
    if (!line.includes("|")) return null;
    if (TABLE_SEP_RE.test(line)) return null;
    const cells = splitTableRow(line);
    if (cells.length < 2) return null;
    rows.push(cells);
  }

  const cols = rows[0].length;
  if (!rows.every((row) => row.length === cols)) return null;
  if (isSepRow(rows[0])) return null;

  // Two-column, two-row "a | b" pairs are too easy to fake from prose.
  if (cols < 3 && rows.length < 3 && !headerHasLexicon(rows[0], 1)) return null;
  return toGfm(rows[0], rows.slice(1));
}

function tryPipeHeaderStacked(lines) {
  if (lines.length < 3) return null;
  const header = splitHeaderLine(lines[0]);
  if (!header || header.length < 2) return null;

  const body = lines.slice(1);
  if (body.some((line) => line.includes("\t") || (line.includes("|") && splitTableRow(line).length === header.length))) {
    return null;
  }
  if (body.length < header.length) return null;
  if (body.length % header.length !== 0) return null;
  if (!header.every(looksLikeHeaderCell) && !headerHasLexicon(header, 1)) return null;

  const rows = [];
  for (let r = 0; r < body.length; r += header.length) {
    rows.push(body.slice(r, r + header.length).map((line) => line.trim()));
  }
  return toGfm(header, rows);
}

function tryStackedTable(lines) {
  const n = lines.length;
  if (n < 4) return null;
  const maxCols = Math.min(8, Math.floor(n / 2));
  for (let cols = maxCols; cols >= 2; cols -= 1) {
    if (n % cols !== 0) continue;
    const rowCount = n / cols;
    if (rowCount < 2) continue;
    const cells = lines.map((line) => line.trim());
    const header = cells.slice(0, cols);
    if (!header.every(looksLikeHeaderCell)) continue;
    if (!headerLooksLikeTable(header, cols)) continue;
    if (cells.slice(cols).some((cell) => looksLikeProseDump(cell) && cols === 2)) continue;
    const rows = [];
    for (let r = 1; r < rowCount; r += 1) {
      rows.push(cells.slice(r * cols, (r + 1) * cols));
    }
    return toGfm(header, rows);
  }
  return null;
}

function headerLooksLikeTable(header, cols) {
  const lexiconHits = header.filter(matchesLexicon).length;
  if (cols <= 2) return lexiconHits >= 2;
  return lexiconHits >= 2;
}

function headerHasLexicon(header, min = 1) {
  return header.filter(matchesLexicon).length >= min;
}

function looksLikeHeaderCell(text) {
  const t = String(text ?? "").trim();
  if (!t || t.length > 60) return false;
  if (HEADING_RE.test(t) || UL_RE.test(t) || OL_RE.test(t)) return false;
  if (SECTION_TITLE_RE.test(t)) return false;
  if (/^\d+(\.\d+)+$/.test(t)) return false;
  if (!/^[A-Za-z]/.test(t)) return false;
  if (t.split(/\s+/).length > 8) return false;
  if (/[.!?]{2}/.test(t)) return false;
  if (/[.!?]$/.test(t) && t.length > 28) return false;
  if (/^[a-z]/.test(t) && t.split(/\s+/).length > 4) return false;
  return true;
}

function matchesLexicon(cell) {
  const words = String(cell ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.some((word) => HEADER_LEXICON.has(word));
}

function looksLikeProseDump(cell) {
  const t = String(cell ?? "").trim();
  return t.length > 80 && /[.!?]/.test(t);
}

function splitHeaderLine(line) {
  if (line.includes("\t")) {
    const cells = line.split("\t").map((cell) => cell.trim());
    if (cells.length >= 2) return cells;
  }
  if (line.includes("|")) {
    const cells = splitTableRow(line);
    if (cells.length >= 2) return cells;
  }
  return null;
}

function isSepRow(cells) {
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(String(cell).trim()));
}

export function isGfmTableStart(lines, i) {
  const row = lines[i];
  const sep = lines[i + 1];
  if (!row || !sep) return false;
  if (!row.includes("|")) return false;
  return TABLE_SEP_RE.test(sep);
}

function consumeGfmTable(lines, start) {
  let i = start + 2;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) break;
    if (HEADING_RE.test(line.trim())) break;
    if (!(line.includes("|") && line.trim())) break;
    i += 1;
  }
  return i;
}

export function splitTableRow(line) {
  let trimmed = String(line ?? "").trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (/(^|[^\\])\|$/.test(trimmed)) trimmed = trimmed.replace(/\|$/, "");
  const cells = [];
  let current = "";
  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed[i] === "\\" && trimmed[i + 1] === "|") {
      current += "|";
      i += 1;
      continue;
    }
    if (trimmed[i] === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += trimmed[i];
  }
  cells.push(current.trim());
  return cells;
}

export function toGfm(header, rows) {
  const fmt = (cells) => `| ${cells.map(escapeCell).join(" | ")} |`;
  const sep = `| ${header.map(() => "---").join(" | ")} |`;
  return [fmt(header), sep, ...rows.map(fmt)].join("\n");
}

function escapeCell(value) {
  return dedupeDuplicatedMath(String(value ?? "").replace(/\s*\n\s*/g, " "))
    .replace(/\|/g, "\\|")
    .trim();
}

function parseHtmlTable(tableHtml) {
  const rows = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRe.exec(tableHtml))) {
    const cells = [];
    const cellRe = /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let cellMatch;
    while ((cellMatch = cellRe.exec(trMatch[1]))) {
      cells.push({
        header: cellMatch[1].toLowerCase() === "th",
        text: cellHtmlToText(cellMatch[0]),
      });
    }
    if (cells.length) rows.push(cells);
  }
  if (rows.length < 2) return null;
  const cols = Math.max(...rows.map((row) => row.length));
  if (cols < 2) return null;

  const pad = (row) => {
    const texts = row.map((cell) => cell.text);
    while (texts.length < cols) texts.push("");
    return texts;
  };

  const firstIsHeader = rows[0].every((cell) => cell.header) || rows[0].some((cell) => cell.header);
  const header = pad(rows[0]);
  const body = (firstIsHeader ? rows.slice(1) : rows.slice(1)).map(pad);
  if (!body.length) return null;
  return { header, rows: body };
}

function cellHtmlToText(html) {
  let work = rewriteMathHtml(String(html ?? ""));
  work = work.replace(/<br\s*\/?>/gi, " ");
  work = work.replace(/<(strong|b)\b[^>]*>/gi, "**");
  work = work.replace(/<\/(strong|b)>/gi, "**");
  work = work.replace(/<(em|i)\b[^>]*>/gi, "*");
  work = work.replace(/<\/(em|i)>/gi, "*");
  work = work.replace(/<code\b[^>]*>/gi, "`");
  work = work.replace(/<\/code>/gi, "`");
  work = work.replace(/<p\b[^>]*>/gi, " ");
  work = work.replace(/<\/p>/gi, " ");
  work = work.replace(/<[^>]+>/g, "");
  return dedupeDuplicatedMath(decodeEntities(work).replace(/\s+/g, " ")).trim();
}

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const MATH_TWIN_CLASS_RE =
  /\b(?:MathJax_Preview|MathJax_SVG|MathJax_Display|MathJax_CHTML|katex-html|MJX_Assistive_MathML|sr-only|visually-hidden|screenreader-only)\b/i;

const GREEK_TEX = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
};

function wrapTex(raw) {
  const tex = decodeEntities(String(raw ?? "").replace(/<[^>]+>/g, "")).trim();
  if (!tex) return "";
  if (tex.startsWith("$") || tex.startsWith("\\(") || tex.startsWith("\\[")) return tex;
  return `$${tex}$`;
}

/**
 * Prefer LaTeX source (annotation / math/tex script / data-latex) and drop the
 * visible MathJax/KaTeX-style HTML twin so cells do not concatenate `$X$` + `X`.
 */
function rewriteMathHtml(html) {
  const s = String(html ?? "");
  let i = 0;
  let out = "";

  while (i < s.length) {
    if (s.startsWith("<!--", i)) {
      const end = s.indexOf("-->", i + 4);
      i = end === -1 ? s.length : end + 3;
      continue;
    }

    const tag = readHtmlTag(s, i);
    if (!tag) {
      out += s[i];
      i += 1;
      continue;
    }

    if (tag.close) {
      out += tag.raw;
      i = tag.end;
      continue;
    }

    if (tag.name === "script" && isMathTexScript(tag.raw)) {
      const close = findMatchingClose(s, tag.end, "script");
      out += wrapTex(s.slice(tag.end, close.start));
      i = close.end;
      continue;
    }

    if (tag.name === "script" || tag.name === "style") {
      i = findMatchingClose(s, tag.end, tag.name).end;
      continue;
    }

    if (tag.name === "math") {
      const close = findMatchingClose(s, tag.end, "math");
      const tex = texFromHtmlFragment(s.slice(i, close.end));
      if (tex) {
        out += wrapTex(tex);
        i = close.end;
        continue;
      }
      out += tag.raw;
      i = tag.end;
      continue;
    }

    if (tag.name === "annotation" && isTexAnnotation(tag.raw)) {
      const close = findMatchingClose(s, tag.end, "annotation");
      out += wrapTex(s.slice(tag.end, close.start));
      i = close.end;
      continue;
    }

    const dataTex = readDataLatex(tag.raw);
    if (dataTex) {
      out += wrapTex(dataTex);
      i = tag.self ? tag.end : findMatchingClose(s, tag.end, tag.name).end;
      continue;
    }

    if (isMathTwinElement(tag.name, tag.raw)) {
      if (!tag.self) {
        const close = findMatchingClose(s, tag.end, tag.name);
        const cls = classAttr(tag.raw);
        const isPreview = MATH_TWIN_CLASS_RE.test(cls);
        const inner = s.slice(tag.end, close.start);
        const innerTex = texFromHtmlFragment(inner);
        if (innerTex) out += wrapTex(innerTex);
        else if (!isPreview) {
          const hiddenText = decodeEntities(inner.replace(/<[^>]+>/g, "")).trim();
          if (/^\$[^$\n]+\$$/.test(hiddenText)) out += hiddenText;
        }
        i = close.end;
      } else {
        i = tag.end;
      }
      continue;
    }

    out += tag.raw;
    i = tag.end;
  }

  return out;
}

function readHtmlTag(s, i) {
  if (s[i] !== "<") return null;
  if (s.startsWith("<!", i) || s.startsWith("<?", i)) {
    const end = s.indexOf(">", i + 2);
    return {
      raw: s.slice(i, end === -1 ? s.length : end + 1),
      name: "",
      close: true,
      self: true,
      end: end === -1 ? s.length : end + 1,
    };
  }
  const end = s.indexOf(">", i);
  if (end === -1) return null;
  const raw = s.slice(i, end + 1);
  const match = raw.match(/^<\/?\s*([a-zA-Z][\w:.-]*)/);
  if (!match) return null;
  const name = match[1].toLowerCase();
  const close = /^<\s*\//.test(raw);
  const self = !close && (VOID_TAGS.has(name) || /\/\s*>$/.test(raw));
  return { raw, name, close, self, end: end + 1 };
}

function findMatchingClose(s, from, name) {
  let depth = 1;
  let i = from;
  while (i < s.length) {
    if (s.startsWith("<!--", i)) {
      const cend = s.indexOf("-->", i + 4);
      i = cend === -1 ? s.length : cend + 3;
      continue;
    }
    if (s[i] !== "<") {
      i += 1;
      continue;
    }
    const tag = readHtmlTag(s, i);
    if (!tag || !tag.name) {
      i += 1;
      continue;
    }
    if (tag.name === name) {
      if (tag.close) {
        depth -= 1;
        if (depth === 0) return { start: i, end: tag.end };
      } else if (!tag.self) {
        depth += 1;
      }
    }
    i = tag.end;
  }
  return { start: s.length, end: s.length };
}

function isMathTexScript(raw) {
  return /type\s*=\s*["']math\/tex/i.test(raw);
}

function isTexAnnotation(raw) {
  return /encoding\s*=\s*["']application\/x-tex["']/i.test(raw) || !/encoding\s*=/i.test(raw);
}

function readDataLatex(raw) {
  const match = raw.match(/\bdata-(?:latex|original)\s*=\s*("([^"]*)"|'([^']*)')/i);
  if (!match) return "";
  return decodeEntities(match[2] ?? match[3] ?? "").trim();
}

function classAttr(raw) {
  const match = raw.match(/\bclass\s*=\s*("([^"]*)"|'([^']*)')/i);
  return match ? match[2] ?? match[3] ?? "" : "";
}

function isMathTwinElement(name, raw) {
  if (name === "mjx-assistive-mml") return true;
  const cls = classAttr(raw);
  if (MATH_TWIN_CLASS_RE.test(cls)) return true;
  if (/\bMathJax\b/i.test(cls) && !/\bMathJax_Preview\b/i.test(cls) && !/math\/tex/i.test(raw)) {
    return true;
  }
  if (/aria-hidden\s*=\s*["']true["']/i.test(raw)) return true;
  if (/style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(raw)) return true;
  return false;
}

function texFromHtmlFragment(html) {
  const fragment = String(html ?? "");
  const annotated =
    fragment.match(/<annotation\b[^>]*encoding=["']application\/x-tex["'][^>]*>([\s\S]*?)<\/annotation>/i) ||
    fragment.match(/<annotation\b[^>]*>([\s\S]*?)<\/annotation>/i);
  if (annotated) return decodeEntities(annotated[1].replace(/<[^>]+>/g, "")).trim();

  const script = fragment.match(/<script\b[^>]*type=["']math\/tex[^"']*["'][^>]*>([\s\S]*?)<\/script>/i);
  if (script) return decodeEntities(script[1].replace(/<[^>]+>/g, "")).trim();

  const data = fragment.match(/\bdata-(?:latex|original)\s*=\s*("([^"]*)"|'([^']*)')/i);
  if (data) return decodeEntities(data[2] ?? data[3] ?? "").trim();
  return "";
}

function rewriteGfmTableLines(lines) {
  return lines.map((line) => {
    if (TABLE_SEP_RE.test(line)) return line;
    if (!line.includes("|")) return dedupeDuplicatedMath(line);
    const cells = splitTableRow(line).map((cell) => dedupeDuplicatedMath(cell).replace(/\|/g, "\\|"));
    return `| ${cells.join(" | ")} |`;
  });
}

/**
 * Collapse `$X$X`, `$\\mu$\\mu`, `$N = 13,335$N=13,335 jars`, and `$\\bar{x}$$x^-$`
 * into a single TeX copy, keeping a unique trailing unit like ` jars`.
 */
function dedupeDuplicatedMath(text) {
  const work = String(text ?? "");
  if (!work.includes("$")) return work;
  const parts = [];
  const codeRe = /(`+)([^`]*?)\1/g;
  let last = 0;
  let match;
  while ((match = codeRe.exec(work))) {
    parts.push(dedupeDuplicatedMathChunk(work.slice(last, match.index)));
    parts.push(match[0]);
    last = match.index + match[0].length;
  }
  parts.push(dedupeDuplicatedMathChunk(work.slice(last)));
  return parts.join("");
}

function dedupeDuplicatedMathChunk(text) {
  let work = String(text ?? "");
  if (!work.includes("$")) return work;

  work = work.replace(/(\$[^$\n]+\$)[ \t]*\1/g, "$1");
  work = work.replace(/\$([^$\n]+)\$[ \t]*\$([^$\n]+)\$/g, (all, a, b) => {
    if (isPlainCopyOfLatex(a, b) || isPlainCopyOfLatex(b, a)) {
      return prefersLatexSource(a, b) ? `$${a}$` : `$${b}$`;
    }
    return all;
  });

  let out = "";
  let i = 0;
  while (i < work.length) {
    if (work[i] === "$" && work[i - 1] !== "\\") {
      const close = findClosingDollar(work, i + 1);
      if (close !== -1) {
        const inner = work.slice(i + 1, close);
        const math = work.slice(i, close + 1);
        const consumed = consumeGluedPlainCopy(inner, work.slice(close + 1));
        out += math;
        i = close + 1 + consumed;
        continue;
      }
    }
    out += work[i];
    i += 1;
  }
  return stripLeadingPlainCopy(out);
}

function stripLeadingPlainCopy(text) {
  return String(text ?? "").replace(/([^$\n]+)(\$[^$\n]+\$)/g, (all, prefix, math) => {
    const inner = math.slice(1, -1);
    if (isPlainCopyOfLatex(inner, prefix)) return math;
    for (let split = prefix.length; split > 0; split -= 1) {
      const copy = prefix.slice(split);
      if (!copy || /[A-Za-z0-9]/.test(prefix[split - 1] || "")) continue;
      if (isPlainCopyOfLatex(inner, copy)) return prefix.slice(0, split) + math;
    }
    if (isPlainCopyOfLatex(inner, prefix.trim())) {
      const space = prefix.match(/^\s*/)?.[0] || "";
      return space + math;
    }
    return all;
  });
}

function findClosingDollar(text, from) {
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === "\n") return -1;
    if (text[i] === "$" && text[i - 1] !== "\\") return i;
  }
  return -1;
}

function prefersLatexSource(a, b) {
  const score = (value) => (value.includes("\\") ? 4 : 0) + (value.includes("{") ? 2 : 0) + value.length / 100;
  return score(a) >= score(b);
}

function isPlainCopyOfLatex(tex, other) {
  const a = compactVisible(tex);
  const b = compactVisible(other);
  if (!a || !b) return false;
  if (a === b) return true;
  const strip = (value) => value.replace(/[-^_¯\u0305\u00AF]/g, "");
  return Boolean(a && (a === strip(b) || strip(a) === strip(b)));
}

function consumeGluedPlainCopy(tex, remainder) {
  if (!remainder) return 0;
  const target = compactVisible(tex);
  if (!target) return 0;

  if (/^[ \t]/.test(remainder)) {
    const trimmed = remainder.replace(/^[ \t]+/, "");
    if (!trimmed.includes("\n") && isPlainCopyOfLatex(tex, trimmed)) return remainder.length;
    return 0;
  }

  // Incomplete TeX prefixes like `\ba` of `\bar{x}` can look "longer" than the
  // unwrapped target (`x`); keep scanning until a prefix actually matches.
  let lastGood = 0;
  for (let ri = 1; ri <= remainder.length; ri += 1) {
    if (remainder[ri - 1] === "\n") break;
    const compact = compactVisible(remainder.slice(0, ri));
    if (compact === target) {
      lastGood = ri;
      break;
    }
  }
  if (!lastGood) return 0;

  let end = lastGood;
  const trail = remainder.slice(end).match(/^[$\^_¯\u0305\u00AF\-−]+/);
  if (trail && isPlainCopyOfLatex(tex, remainder.slice(0, end + trail[0].length))) {
    end += trail[0].length;
  }
  if (end < remainder.length && /[A-Za-z0-9]/.test(remainder[end])) return 0;
  return end;
}

function compactVisible(tex) {
  return expandTexForCompare(tex).replace(/\s+/g, "").toLowerCase();
}

function expandTexForCompare(tex) {
  let s = String(tex ?? "");
  s = s.replace(/\\text\{([^}]*)\}/g, "$1");
  s = s.replace(/\\mathrm\{([^}]*)\}/g, "$1");
  s = s.replace(/\\operatorname\{([^}]*)\}/g, "$1");
  s = s.replace(/\\(?:bar|overline|underline|hat|tilde|vec|dot|ddot|mathbf|mathbb|mathcal|boldsymbol|mathsf|mathfrak)\{([^}]*)\}/g, "$1");
  s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg)\b/g, "");
  s = s.replace(/\\(?:quad|qquad)/g, " ");
  s = s.replace(/\\[,;!]/g, "");
  s = s.replace(/\\([A-Za-z]+)/g, (_, name) => GREEK_TEX[name] || name);
  s = s.replace(/[\\{}$]/g, "");
  s = s.replace(/[\u2212\u2013\u2014−]/g, "-");
  return s;
}

function htmlBlocksToMarkdown(html) {
  let s = String(html ?? "");
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<h([1-6])\b[^>]*>/gi, (_, n) => `\n${"#".repeat(Number(n))} `);
  s = s.replace(/<\/h[1-6]>/gi, "\n\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|section|article|blockquote)>/gi, "\n\n");
  s = s.replace(/<(p|div|section|article)\b[^>]*>/gi, "\n");
  s = s.replace(/<li\b[^>]*>/gi, "\n- ");
  s = s.replace(/<\/li>/gi, "\n");
  s = s.replace(/<\/?(ul|ol|thead|tbody|tfoot)>/gi, "\n");
  s = s.replace(/<(strong|b)\b[^>]*>/gi, "**");
  s = s.replace(/<\/(strong|b)>/gi, "**");
  s = s.replace(/<(em|i)\b[^>]*>/gi, "*");
  s = s.replace(/<\/(em|i)>/gi, "*");
  s = s.replace(/<code\b[^>]*>/gi, "`");
  s = s.replace(/<\/code>/gi, "`");
  s = s.replace(/<pre\b[^>]*>/gi, "\n```\n");
  s = s.replace(/<\/pre>/gi, "\n```\n");
  s = s.replace(/<[^>]+>/g, "");
  return s;
}

function stripClipboardWrapper(html) {
  const start = html.indexOf("<!--StartFragment-->");
  const end = html.indexOf("<!--EndFragment-->");
  if (start !== -1 && end !== -1 && end > start) {
    return html.slice(start + "<!--StartFragment-->".length, end);
  }
  return html;
}

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => safeChar(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeChar(Number(dec)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&rsquo;/gi, "’")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&rdquo;/gi, "”")
    .replace(/&ldquo;/gi, "“");
}

function safeChar(code) {
  if (!Number.isFinite(code) || code <= 0) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

function collapseBlankLines(text) {
  return String(text ?? "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

function normalizeNewlines(input) {
  return String(input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u2028/g, "\n")
    .replace(/\u2029/g, "\n\n")
    .replace(/\u00A0/g, " ");
}
