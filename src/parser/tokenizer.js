const LETTER = /[A-Za-z]/;
const DIGIT = /[0-9]/;

export function tokenizeLatex(input) {
  const source = String(input ?? "");
  const tokens = [];
  let i = 0;

  const push = (type, value, extra = {}) => {
    tokens.push({ type, value, index: extra.index ?? i, ...extra });
  };

  while (i < source.length) {
    const ch = source[i];

    if (ch === "%") {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }

    if (/\s/.test(ch)) {
      if (ch === "\n" || ch === "\r") {
        i += 1;
        continue;
      }
      let j = i;
      while (j < source.length && (source[j] === " " || source[j] === "\t")) j += 1;
      push("space", " ");
      i = j;
      continue;
    }

    if (ch === "\\") {
      if (i + 1 >= source.length) {
        push("symbol", "\\");
        i += 1;
        continue;
      }
      const next = source[i + 1];
      if (!LETTER.test(next)) {
        push("command", next);
        i += 2;
        continue;
      }
      let j = i + 1;
      while (j < source.length && LETTER.test(source[j])) j += 1;
      const name = source.slice(i + 1, j);
      push("command", name);
      i = j;
      if (source[i] === " ") i += 1;
      continue;
    }

    if (ch === "{") {
      push("lbrace", "{");
      i += 1;
      continue;
    }
    if (ch === "}") {
      push("rbrace", "}");
      i += 1;
      continue;
    }
    if (ch === "[") {
      push("lbracket", "[");
      i += 1;
      continue;
    }
    if (ch === "]") {
      push("rbracket", "]");
      i += 1;
      continue;
    }
    if (ch === "(") {
      push("lparen", "(");
      i += 1;
      continue;
    }
    if (ch === ")") {
      push("rparen", ")");
      i += 1;
      continue;
    }
    if (ch === "^") {
      push("sup", "^");
      i += 1;
      continue;
    }
    if (ch === "_") {
      push("sub", "_");
      i += 1;
      continue;
    }
    if (ch === "&") {
      push("align", "&");
      i += 1;
      continue;
    }

    if (DIGIT.test(ch) || (ch === "." && DIGIT.test(source[i + 1] || ""))) {
      let j = i;
      let seenDot = ch === ".";
      j += 1;
      while (j < source.length) {
        const c = source[j];
        if (DIGIT.test(c)) {
          j += 1;
          continue;
        }
        if (c === "." && !seenDot) {
          seenDot = true;
          j += 1;
          continue;
        }
        break;
      }
      push("number", source.slice(i, j));
      i = j;
      continue;
    }

    if (LETTER.test(ch)) {
      push("letter", ch);
      i += 1;
      continue;
    }

    push("symbol", ch);
    i += 1;
  }

  return tokens;
}
