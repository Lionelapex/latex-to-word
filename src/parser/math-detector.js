import { knownMathCommands } from "./latex-parser.js";

export const PLACEHOLDER_START = "\uE000";
export const PLACEHOLDER_END = "\uE001";

export function makePlaceholder(index) {
  return `${PLACEHOLDER_START}${index}${PLACEHOLDER_END}`;
}

export const PLACEHOLDER_RE = /\uE000(\d+)\uE001/g;

export const KNOWN_MATH_COMMANDS = knownMathCommands();

export function isMathLike(source) {
  const text = String(source ?? "");
  if (/\\[A-Za-z]+/.test(text)) return true;
  if (/[=^_]/.test(text) && /[A-Za-z]/.test(text) && /[+\-*/=]/.test(text)) return true;
  return false;
}

export function looksLikeCitation(inner) {
  const trimmed = String(inner).trim();
  if (/^\d+$/.test(trimmed)) return true;
  if (/^\^/.test(trimmed)) return true;
  if (/^[A-Za-z][A-Za-z0-9-]*(,\s*\d{4})?$/.test(trimmed) && !/\\/.test(trimmed)) return true;
  return false;
}

export function scoreMathSnippet(snippet) {
  const text = String(snippet ?? "").trim();
  if (!text) return 0;
  if (/^[A-Za-z]:\\/.test(text) || /\\(Users|Windows|Documents|Program Files)/.test(text)) {
    return 0;
  }

  let score = 0;
  const commands = text.match(/\\[A-Za-z]+/g) || [];
  for (const raw of commands) {
    const name = raw.slice(1);
    if (KNOWN_MATH_COMMANDS.has(name)) {
      if (["frac", "dfrac", "sqrt", "sum", "prod", "int", "bar", "hat", "lim"].includes(name)) score += 0.65;
      else if (name[0] === name[0].toLowerCase() && name.length <= 7) score += 0.28;
      else score += 0.2;
    } else {
      score += 0.22;
    }
  }
  if (/\{[^{}]*\}/.test(text)) score += 0.1;
  if (/[_^]/.test(text)) score += 0.12;
  if (/[=+\-*/]/.test(text) && /\\|[A-Za-z][_^]/.test(text)) score += 0.08;
  if (commands.length === 0 && /^[A-Za-z][_^]/.test(text)) score += 0.72;
  return Math.max(0, Math.min(1, score));
}

export function findSmartMath(text, { threshold = 0.7 } = {}) {
  const matches = [];
  const source = String(text ?? "");
  const used = new Array(source.length).fill(false);

  const mark = (start, end, snippet, score) => {
    if (end <= start) return;
    if (score < threshold) return;
    for (let i = start; i < end; i += 1) {
      if (used[i]) return;
    }
    for (let i = start; i < end; i += 1) used[i] = true;
    matches.push({ start, end, source: snippet, score });
  };

  const commandRe = /\\([A-Za-z]+)/g;
  let match;
  while ((match = commandRe.exec(source))) {
    const name = match[1];
    if (!KNOWN_MATH_COMMANDS.has(name)) continue;
    if (match.index > 0 && /[A-Za-z0-9]/.test(source[match.index - 1])) continue;
    const end = extendLatexExpression(source, match.index, name);
    const snippet = source.slice(match.index, end);
    const withTail = absorbRelationTail(source, match.index, end);
    const scored = scoreMathSnippet(withTail.snippet);
    mark(match.index, withTail.end, withTail.snippet, Math.max(scored, 0.85));
  }

  const scriptRe = /(^|[^A-Za-z0-9\\])([A-Za-z])(_(?:\{[^}]+\}|[A-Za-z0-9]{1,3})|\^(?:\{[^}]+\}|[A-Za-z0-9]{1,3}))/g;
  while ((match = scriptRe.exec(source))) {
    const start = match.index + match[1].length;
    const end = match.index + match[0].length;
    if (used[start]) continue;
    const before = source.slice(Math.max(0, start - 8), start);
    if (/[A-Za-z]{2,}$/.test(before)) continue;
    const snippet = source.slice(start, end);
    mark(start, end, snippet, scoreMathSnippet(snippet));
  }

  matches.sort((a, b) => a.start - b.start);
  return matches;
}

function extendLatexExpression(source, start, name) {
  let i = start + 1 + name.length;
  i = skipSpaces(source, i);
  const arity = commandArity(name);
  if (name === "sqrt") {
    if (source[i] === "[") i = skipBalanced(source, i, "[", "]");
    i = skipSpaces(source, i);
    if (source[i] === "{") i = skipBalanced(source, i, "{", "}");
    i = skipScripts(source, i);
    return i;
  }
  if (name === "begin") {
    if (source[i] === "{") {
      const envEnd = skipBalanced(source, i, "{", "}");
      const env = source.slice(i + 1, envEnd - 1);
      const closer = `\\end{${env}}`;
      const closeAt = source.indexOf(closer, envEnd);
      return closeAt === -1 ? envEnd : closeAt + closer.length;
    }
  }
  for (let n = 0; n < arity; n += 1) {
    i = skipSpaces(source, i);
    if (source[i] === "{") i = skipBalanced(source, i, "{", "}");
    else i = skipSingleToken(source, i);
  }
  i = skipScripts(source, i);
  return i;
}

function commandArity(name) {
  if (["frac", "dfrac", "tfrac", "binom"].includes(name)) return 2;
  if (["bar", "hat", "vec", "tilde", "dot", "ddot", "overline", "text", "mathrm", "operatorname"].includes(name)) {
    return 1;
  }
  return 0;
}

function skipSpaces(source, i) {
  while (i < source.length && /[ \t]/.test(source[i])) i += 1;
  return i;
}

function skipBalanced(source, i, open, close) {
  if (source[i] !== open) return i;
  let depth = 0;
  for (let j = i; j < source.length; j += 1) {
    if (source[j] === "\\" && j + 1 < source.length) {
      j += 1;
      continue;
    }
    if (source[j] === open) depth += 1;
    else if (source[j] === close) {
      depth -= 1;
      if (depth === 0) return j + 1;
    }
  }
  return source.length;
}

function skipSingleToken(source, i) {
  if (i >= source.length) return i;
  if (source[i] === "\\") {
    i += 1;
    while (i < source.length && /[A-Za-z]/.test(source[i])) i += 1;
    return i;
  }
  return i + 1;
}

function skipScripts(source, i) {
  while (true) {
    i = skipSpaces(source, i);
    if (source[i] !== "_" && source[i] !== "^") break;
    i += 1;
    i = skipSpaces(source, i);
    if (source[i] === "{") i = skipBalanced(source, i, "{", "}");
    else i = skipSingleToken(source, i);
  }
  return i;
}

function absorbRelationTail(source, start, end) {
  let i = skipSpaces(source, end);
  if (source[i] !== "=" && !(source[i] === "\\" && /^\\(approx|neq|leq|geq|sim|equiv)/.test(source.slice(i)))) {
    return { end, snippet: source.slice(start, end) };
  }
  if (source[i] === "\\") {
    const m = source.slice(i).match(/^\\[A-Za-z]+/);
    i += m ? m[0].length : 1;
  } else {
    i += 1;
  }
  i = skipSpaces(source, i);
  if (source[i] === "\\") {
    const cmd = source.slice(i).match(/^\\([A-Za-z]+)/);
    if (cmd) i = extendLatexExpression(source, i, cmd[1]);
  } else {
    while (i < source.length && /[0-9.A-Za-z\\{}^_+-]/.test(source[i])) {
      if (source[i] === "\\") {
        const cmd = source.slice(i).match(/^\\([A-Za-z]+)/);
        if (cmd && KNOWN_MATH_COMMANDS.has(cmd[1])) {
          i = extendLatexExpression(source, i, cmd[1]);
          continue;
        }
        break;
      }
      if (source[i] === "{") {
        i = skipBalanced(source, i, "{", "}");
        continue;
      }
      if (source[i] === " " || source[i] === "\n") break;
      i += 1;
    }
  }
  return { end: i, snippet: source.slice(start, i) };
}

export function detectModeThreshold(mode) {
  if (mode === "strict") return 1.1;
  return 0.7;
}
