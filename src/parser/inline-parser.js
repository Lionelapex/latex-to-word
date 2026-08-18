import { PLACEHOLDER_RE } from "./protect.js";

export function parseInlines(raw, slots) {
  const source = String(raw ?? "");
  const chunks = splitByPlaceholders(source);
  const nodes = [];
  for (const chunk of chunks) {
    if (chunk.type === "slot") {
      const slot = slots[chunk.index];
      if (!slot) continue;
      nodes.push(slotToInline(slot, chunk.index));
    } else {
      nodes.push(...parseEmphasis(chunk.value));
    }
  }
  return mergeText(nodes);
}

function splitByPlaceholders(source) {
  const chunks = [];
  let last = 0;
  const re = new RegExp(PLACEHOLDER_RE.source, "g");
  let match;
  while ((match = re.exec(source))) {
    if (match.index > last) {
      chunks.push({ type: "text", value: source.slice(last, match.index) });
    }
    chunks.push({ type: "slot", index: Number(match[1]) });
    last = match.index + match[0].length;
  }
  if (last < source.length) {
    chunks.push({ type: "text", value: source.slice(last) });
  }
  return chunks;
}

function slotToInline(slot, index) {
  if (slot.kind === "icode") {
    return { type: "code", value: slot.source };
  }
  if (slot.kind === "code") {
    return { type: "code", value: slot.source };
  }
  return { type: "math-slot", slotIndex: index };
}

function parseEmphasis(text) {
  const nodes = [];
  let i = 0;
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    nodes.push({ type: "text", value: unescapeMarkdown(buffer) });
    buffer = "";
  };

  while (i < text.length) {
    if (text[i] === "\\" && i + 1 < text.length && /[*_\\`[]/.test(text[i + 1])) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }
    if (text.startsWith("***", i) || text.startsWith("___", i)) {
      const delim = text.slice(i, i + 3);
      const close = findClose(text, i + 3, delim);
      if (close !== -1) {
        flush();
        const inner = parseEmphasis(text.slice(i + 3, close));
        nodes.push({ type: "strong", children: [{ type: "emphasis", children: inner }] });
        i = close + 3;
        continue;
      }
    }
    if (text.startsWith("**", i) || text.startsWith("__", i)) {
      const delim = text.slice(i, i + 2);
      const close = findClose(text, i + 2, delim);
      if (close !== -1) {
        flush();
        nodes.push({ type: "strong", children: parseEmphasis(text.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
    }
    if (text[i] === "*" || text[i] === "_") {
      const delim = text[i];
      if (delim === "_" && isLikelyIdentifierUnderscore(text, i)) {
        buffer += delim;
        i += 1;
        continue;
      }
      const close = findClose(text, i + 1, delim);
      if (close !== -1) {
        flush();
        nodes.push({ type: "emphasis", children: parseEmphasis(text.slice(i + 1, close)) });
        i = close + 1;
        continue;
      }
    }
    buffer += text[i];
    i += 1;
  }
  flush();
  return nodes;
}

function findClose(text, from, delim) {
  let i = from;
  while (i < text.length) {
    if (text[i] === "\\" && i + 1 < text.length) {
      i += 2;
      continue;
    }
    if (text.startsWith(delim, i)) return i;
    i += 1;
  }
  return -1;
}

function isLikelyIdentifierUnderscore(text, i) {
  const prev = text[i - 1] || "";
  const next = text[i + 1] || "";
  return /[A-Za-z0-9]/.test(prev) && /[A-Za-z0-9]/.test(next);
}

function unescapeMarkdown(value) {
  return value.replace(/\\([*_\\`[\]])/g, "$1");
}

function mergeText(nodes) {
  const out = [];
  for (const node of nodes) {
    if (node.type === "text" && out.length && out[out.length - 1].type === "text") {
      out[out.length - 1].value += node.value;
    } else if (node.children) {
      out.push({ ...node, children: mergeText(node.children) });
    } else {
      out.push(node);
    }
  }
  return out;
}
