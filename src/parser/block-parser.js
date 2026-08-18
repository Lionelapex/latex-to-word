import { normalizeMarkdownSource, PLACEHOLDER_RE } from "./protect.js";
import { splitTableRow } from "./table-normalizer.js";

const HEADING_RE = /^(#{1,6})[ \t]+(.+?)\s*#*\s*$/;
const HR_RE = /^(?:\*\s*){3,}$|^(?:-\s*){3,}$|^(?:_\s*){3,}$/;
const FENCE_PLACEHOLDER = /^\uE000(\d+)\uE001\s*$/;
const UL_RE = /^([ \t]*)([-*+•‣◦▪●∙])[ \t]+(.*)$/;
const OL_RE = /^([ \t]*)(\d+)[.)][ \t]+(.*)$/;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const BLOCKQUOTE_RE = /^>[ \t]?(.*)$/;

export function parseBlocks(text) {
  const lines = normalizeMarkdownSource(text).split("\n");
  const blocks = [];
  let i = 0;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const raw = paragraph.join("\n").trim();
    paragraph = [];
    if (!raw) return;
    if (isOnlyPlaceholder(raw)) {
      blocks.push({ type: "placeholder", raw });
      return;
    }
    blocks.push({ type: "paragraph", raw });
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      i += 1;
      continue;
    }

    const heading = trimmed.match(HEADING_RE);
    if (heading) {
      flushParagraph();
      blocks.push({ type: "heading", level: heading[1].length, raw: heading[2] });
      i += 1;
      continue;
    }

    if (HR_RE.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "rule" });
      i += 1;
      continue;
    }

    // Display-math / fence placeholders must be their own block even when
    // ChatGPT omits the blank line before or after them.
    if (FENCE_PLACEHOLDER.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "placeholder", raw: trimmed });
      i += 1;
      continue;
    }

    const quote = line.match(BLOCKQUOTE_RE);
    if (quote) {
      flushParagraph();
      const quoted = [];
      while (i < lines.length && BLOCKQUOTE_RE.test(lines[i])) {
        quoted.push(lines[i].replace(/^>[ \t]?/, ""));
        i += 1;
      }
      blocks.push({
        type: "quote",
        blocks: parseBlocks(quoted.join("\n")),
      });
      continue;
    }

    if (isTableStart(lines, i)) {
      flushParagraph();
      const table = parseTable(lines, i);
      blocks.push(table.block);
      i = table.next;
      continue;
    }

    if (UL_RE.test(line) || OL_RE.test(line)) {
      flushParagraph();
      const list = parseList(lines, i);
      blocks.push(list.block);
      i = list.next;
      continue;
    }

    paragraph.push(line);
    i += 1;
  }

  flushParagraph();
  return blocks;
}

function isOnlyPlaceholder(raw) {
  const stripped = raw.replace(PLACEHOLDER_RE, "").trim();
  return stripped.length === 0 && PLACEHOLDER_RE.test(raw);
}

function isTableStart(lines, i) {
  const row = lines[i];
  const sep = lines[i + 1];
  if (!row || !sep) return false;
  return (TABLE_ROW_RE.test(row) || row.includes("|")) && TABLE_SEP_RE.test(sep);
}

function parseTable(lines, start) {
  const headerCells = splitTableRow(lines[start]);
  const aligns = splitTableRow(lines[start + 1]).map(parseAlign);
  const rows = [];
  let i = start + 2;
  while (i < lines.length && (TABLE_ROW_RE.test(lines[i]) || (lines[i].includes("|") && lines[i].trim()))) {
    if (!lines[i].trim()) break;
    if (HEADING_RE.test(lines[i].trim())) break;
    rows.push(splitTableRow(lines[i]).map((raw) => ({ raw, inlines: null })));
    i += 1;
  }
  return {
    next: i,
    block: {
      type: "table",
      aligns,
      header: headerCells.map((raw) => ({ raw, inlines: null })),
      rows,
    },
  };
}

function parseAlign(cell) {
  const value = cell.trim();
  const left = value.startsWith(":");
  const right = value.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  return "left";
}

function parseList(lines, start) {
  const first = lines[start].match(UL_RE) || lines[start].match(OL_RE);
  const startOrdered = Boolean(lines[start].match(OL_RE));
  const startIndent = expandTabs(first[1]).length;
  const entries = [];
  let i = start;
  while (i < lines.length) {
    if (!lines[i].trim()) {
      const next = nextNonEmpty(lines, i + 1);
      if (next !== -1 && isListLine(lines[next])) {
        i = next;
        continue;
      }
      break;
    }
    const ul = lines[i].match(UL_RE);
    const ol = lines[i].match(OL_RE);
    const m = ul || ol;
    if (!m) {
      const indent = leadingIndent(lines[i]);
      if (entries.length && indent > startIndent) {
        entries[entries.length - 1].text += `\n${lines[i].trim()}`;
        i += 1;
        continue;
      }
      break;
    }
    const indent = expandTabs(m[1]).length;
    const ordered = Boolean(ol);
    if (indent === startIndent && ordered !== startOrdered) break;
    entries.push({ indent, ordered, text: m[3] });
    i += 1;
  }
  return {
    next: i,
    block: nestListEntries(entries, 0, entries[0]?.indent ?? 0).block,
  };
}

function isListLine(line) {
  return UL_RE.test(line) || OL_RE.test(line);
}

function nextNonEmpty(lines, start) {
  for (let i = start; i < lines.length; i += 1) {
    if (lines[i].trim()) return i;
  }
  return -1;
}

function leadingIndent(line) {
  const match = line.match(/^([ \t]*)/);
  return expandTabs(match?.[1] || "").length;
}

function nestListEntries(entries, start, minIndent) {
  const items = [];
  let i = start;
  const ordered = entries[start]?.ordered ?? false;
  while (i < entries.length && entries[i].indent >= minIndent) {
    if (entries[i].indent > minIndent) break;
    const item = { raw: entries[i].text, blocks: [] };
    i += 1;
    if (i < entries.length && entries[i].indent > minIndent) {
      const nested = nestListEntries(entries, i, entries[i].indent);
      item.blocks.push(nested.block);
      i = nested.next;
    }
    items.push(item);
  }
  return { next: i, block: { type: "list", ordered, items } };
}

function expandTabs(value) {
  return String(value ?? "").replace(/\t/g, "    ");
}
