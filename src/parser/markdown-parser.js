import { createDocument } from "../model/document-model.js";
import { parseBlocks } from "./block-parser.js";
import { parseInlines } from "./inline-parser.js";
import { parseLatex } from "./latex-parser.js";
import { protectCodeAndMath } from "./protect.js";
import { normalizePlainTableSource } from "./table-normalizer.js";

export function parseDocument(input, { mode = "smart" } = {}) {
  const prepared = normalizePlainTableSource(input);
  const { text, slots } = protectCodeAndMath(prepared, { mode });
  const rawBlocks = parseBlocks(text);
  const blocks = rawBlocks.flatMap((block) => hydrateBlock(block, slots));
  return createDocument(blocks);
}

function hydrateBlock(block, slots) {
  if (!block) return [];
  if (block.type === "placeholder") {
    const inlines = parseInlines(block.raw, slots);
    const only = inlines.length === 1 ? inlines[0] : null;
    if (only?.type === "code") {
      return [materializeCode(slots, block.raw)];
    }
    return splitAroundDisplayMath(materializeInlines(inlines, slots));
  }
  if (block.type === "heading") {
    return [{ type: "heading", level: block.level, inlines: materializeInlines(parseInlines(block.raw, slots), slots) }];
  }
  if (block.type === "paragraph") {
    return splitAroundDisplayMath(materializeInlines(parseInlines(block.raw, slots), slots));
  }
  if (block.type === "rule") return [{ type: "rule" }];
  if (block.type === "quote") {
    return [
      {
        type: "quote",
        blocks: (block.blocks || []).flatMap((child) => hydrateBlock(child, slots)),
      },
    ];
  }
  if (block.type === "list") {
    return [
      {
        type: "list",
        ordered: block.ordered,
        items: (block.items || []).map((item) => hydrateListItem(item, slots)),
      },
    ];
  }
  if (block.type === "table") {
    return [
      {
        type: "table",
        aligns: block.aligns || [],
        header: (block.header || []).map((cell) => ({
          inlines: materializeInlines(parseInlines(cell.raw, slots), slots),
        })),
        rows: (block.rows || []).map((row) =>
          row.map((cell) => ({
            inlines: materializeInlines(parseInlines(cell.raw, slots), slots),
          })),
        ),
      },
    ];
  }
  return [block];
}

function hydrateListItem(item, slots) {
  const pieces = splitAroundDisplayMath(materializeInlines(parseInlines(item.raw, slots), slots));
  const nested = (item.blocks || []).flatMap((child) => hydrateBlock(child, slots));
  let inlines = [];
  const blocks = [];
  let index = 0;
  if (pieces[0]?.type === "paragraph") {
    inlines = pieces[0].inlines;
    index = 1;
  }
  for (; index < pieces.length; index += 1) blocks.push(pieces[index]);
  blocks.push(...nested);
  return { inlines, blocks };
}

function splitAroundDisplayMath(inlines) {
  const blocks = [];
  let current = [];

  const flush = () => {
    const trimmed = trimInlines(current);
    current = [];
    if (!trimmed.length) return;
    if (trimmed.length === 1 && trimmed[0].type === "math" && trimmed[0].display) {
      blocks.push(trimmed[0]);
      return;
    }
    blocks.push({ type: "paragraph", inlines: trimmed });
  };

  for (const node of inlines || []) {
    if (node.type === "math" && node.display) {
      flush();
      blocks.push(node);
    } else {
      current.push(node);
    }
  }
  flush();
  return blocks;
}

function trimInlines(inlines) {
  const nodes = (inlines || []).map((node) => {
    if (node.type !== "text") return node;
    return { ...node, value: node.value.replace(/\n+/g, " ") };
  });
  while (nodes.length && nodes[0].type === "text" && !nodes[0].value.trim()) nodes.shift();
  while (nodes.length && nodes[nodes.length - 1].type === "text" && !nodes[nodes.length - 1].value.trim()) {
    nodes.pop();
  }
  if (nodes[0]?.type === "text") {
    nodes[0] = { ...nodes[0], value: nodes[0].value.replace(/^\s+/, "") };
  }
  if (nodes.length && nodes[nodes.length - 1]?.type === "text") {
    const last = nodes[nodes.length - 1];
    nodes[nodes.length - 1] = { ...last, value: last.value.replace(/\s+$/, "") };
  }
  return nodes.filter((node) => node.type !== "text" || node.value);
}

function materializeInlines(inlines, slots) {
  const out = [];
  for (const node of inlines) {
    if (node.type === "math-slot") {
      out.push(materializeMath(slots[node.slotIndex], false));
      continue;
    }
    if (node.children) {
      out.push({ ...node, children: materializeInlines(node.children, slots) });
      continue;
    }
    out.push(node);
  }
  return out;
}

function materializeMath(slot, forceDisplay) {
  if (!slot) {
    return { type: "math", display: forceDisplay, source: "", ast: parseLatex(""), delimiter: "missing" };
  }
  if (slot.kind === "code") {
    return { type: "code", value: stripFence(slot.source) };
  }
  const display = forceDisplay || Boolean(slot.display);
  const ast = parseLatex(slot.source);
  return {
    type: "math",
    display,
    source: slot.source,
    delimiter: slot.delimiter,
    ast,
  };
}

function materializeCode(slots, raw) {
  const match = raw.match(/\uE000(\d+)\uE001/);
  const slot = match ? slots[Number(match[1])] : null;
  if (slot?.kind === "code") {
    return { type: "code", language: fenceLanguage(slot.source), value: stripFence(slot.source) };
  }
  return { type: "code", language: "", value: raw };
}

function stripFence(source) {
  return String(source)
    .replace(/^[ \t]*```[^\n]*\n/, "")
    .replace(/\n?```[ \t]*$/, "");
}

function fenceLanguage(source) {
  const match = String(source).match(/^[ \t]*```([^\n]*)\n/);
  return (match?.[1] || "").trim();
}

export { parseLatex };
export { parseBlocks } from "./block-parser.js";
export { parseInlines } from "./inline-parser.js";
export { protectCodeAndMath } from "./protect.js";
export { findSmartMath, scoreMathSnippet } from "./math-detector.js";
