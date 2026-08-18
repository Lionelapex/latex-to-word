import {
  PLACEHOLDER_RE,
  findSmartMath,
  isMathLike,
  looksLikeCitation,
  makePlaceholder,
} from "./math-detector.js";
import { parseLatex } from "./latex-parser.js";

export function normalizeMarkdownSource(input) {
  return String(input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u2028/g, "\n")
    .replace(/\u2029/g, "\n\n")
    .replace(/\u00A0/g, " ");
}

export function protectCodeAndMath(input, { mode = "smart" } = {}) {
  const slots = [];
  let text = normalizeMarkdownSource(input);

  const push = (slot) => {
    const token = makePlaceholder(slots.length);
    slots.push(slot);
    return token;
  };

  text = text.replace(/^([ \t]*```[^\n]*\n[\s\S]*?^```[ \t]*)$/gm, (match) =>
    push({ kind: "code", source: match }),
  );

  text = text.replace(/`([^`\n]+)`/g, (match, body) =>
    push({ kind: "icode", source: body }),
  );

  text = replaceAll(text, /\\\[([\s\S]*?)\\\]/g, (_, body) =>
    push({ kind: "math", display: true, source: body.trim(), delimiter: "\\[\\]" }),
  );

  text = replaceAll(text, /\$\$([\s\S]*?)\$\$/g, (_, body) =>
    push({ kind: "math", display: true, source: body.trim(), delimiter: "$$" }),
  );

  text = replaceAll(text, /\\\(([\s\S]*?)\\\)/g, (_, body) =>
    push({ kind: "math", display: false, source: body.trim(), delimiter: "\\(\\)" }),
  );

  text = replaceDollarMath(text, push);
  text = replaceBracketMath(text, push);

  if (mode === "smart") {
    const found = findSmartMath(text);
    for (let i = found.length - 1; i >= 0; i -= 1) {
      const item = found[i];
      const token = push({
        kind: "math",
        display: false,
        source: item.source.trim(),
        delimiter: "smart",
        score: item.score,
      });
      text = text.slice(0, item.start) + token + text.slice(item.end);
    }
  }

  return { text, slots };
}

function replaceAll(text, regex, replacer) {
  return text.replace(regex, (...args) => replacer(...args));
}

function replaceDollarMath(text, push) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "$" && text[i - 1] !== "\\") {
      const close = findClosingDollar(text, i + 1);
      if (close !== -1) {
        const body = text.slice(i + 1, close);
        if (shouldConvertDollar(body, text, i, close)) {
          out += push({ kind: "math", display: false, source: body.trim(), delimiter: "$" });
          i = close + 1;
          continue;
        }
      }
    }
    out += text[i];
    i += 1;
  }
  return out;
}

function findClosingDollar(text, from) {
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === "\n" && text[i + 1] === "\n") return -1;
    if (text[i] === "$" && text[i - 1] !== "\\") return i;
  }
  return -1;
}

function shouldConvertDollar(body) {
  const trimmed = body.trim();
  if (!trimmed) return false;
  if (/[A-Za-z\\^_*=+/]/.test(trimmed)) return true;
  if (/^\d+([.,]\d+)?$/.test(trimmed)) return true;
  return false;
}

function replaceBracketMath(text, push) {
  let result = text.replace(/(^|\n)[ \t]*\[[ \t]*\n([\s\S]*?)\n[ \t]*\][ \t]*(?=\n|$)/g, (match, lead, body) => {
    if (!isMathLike(body) || looksLikeCitation(body)) return match;
    return `${lead}${push({ kind: "math", display: true, source: body.trim(), delimiter: "[]" })}`;
  });

  result = result.replace(/(^|[^\\])\[([^\]\n]+)\](?!\()/g, (match, lead, body) => {
    if (looksLikeCitation(body) || !isMathLike(body)) return match;
    if (/^\s*https?:/.test(body)) return match;
    return `${lead}${push({ kind: "math", display: true, source: body.trim(), delimiter: "[]" })}`;
  });

  return result;
}

export function restorePlaceholders(text, slots) {
  return String(text).replace(PLACEHOLDER_RE, (_, index) => {
    const slot = slots[Number(index)];
    if (!slot) return "";
    if (slot.kind === "icode") return `\`${slot.source}\``;
    return slot.source;
  });
}

export function parseMathSlot(slot) {
  const ast = parseLatex(slot.source);
  return {
    type: "math",
    display: Boolean(slot.display),
    source: slot.source,
    delimiter: slot.delimiter,
    ast,
    warning: ast.type === "failed" ? false : undefined,
    id: slot.id,
  };
}

export { PLACEHOLDER_RE, makePlaceholder };
