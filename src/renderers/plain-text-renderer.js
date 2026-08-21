const SUPER = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "−": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  n: "ⁿ",
  i: "ⁱ",
};

const SUB = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "−": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  a: "ₐ",
  e: "ₑ",
  o: "ₒ",
  x: "ₓ",
  i: "ᵢ",
  r: "ᵣ",
  n: "ₙ",
  t: "ₜ",
};

const ACCENT_COMBINING = {
  bar: "\u0304",
  hat: "\u0302",
  vec: "\u20D7",
  tilde: "\u0303",
  dot: "\u0307",
  ddot: "\u0308",
  breve: "\u0306",
  check: "\u030C",
  acute: "\u0301",
  grave: "\u0300",
};

function mapScript(text, table) {
  let out = "";
  for (const ch of String(text ?? "")) {
    if (!Object.prototype.hasOwnProperty.call(table, ch)) return null;
    out += table[ch];
  }
  return out;
}

function isSimpleAtom(node) {
  if (!node) return false;
  if (node.type === "atom") return true;
  if (node.type === "group" && (node.children || []).length === 1) return isSimpleAtom(node.children[0]);
  return false;
}

export function mathToPlainText(node) {
  if (!node) return "";
  switch (node.type) {
    case "group":
      return (node.children || []).map(mathToPlainText).join("");
    case "atom":
    case "text":
      return node.value || "";
    case "superscript": {
      const base = wrapIfNeeded(node.base);
      const exp = mathToPlainText(node.exponent);
      const uni = mapScript(exp, SUPER);
      return uni ? `${base}${uni}` : `${base}^(${exp})`;
    }
    case "subscript": {
      const base = wrapIfNeeded(node.base);
      const sub = mathToPlainText(node.sub);
      const uni = mapScript(sub, SUB);
      return uni ? `${base}${uni}` : `${base}_${sub.length === 1 ? sub : `{${sub}}`}`;
    }
    case "subsuperscript": {
      const base = wrapIfNeeded(node.base);
      const sub = mathToPlainText(node.sub);
      const exp = mathToPlainText(node.exponent || node.sup);
      const subUni = mapScript(sub, SUB);
      const expUni = mapScript(exp, SUPER);
      const subPart = subUni || `_{${sub}}`;
      const expPart = expUni || `^(${exp})`;
      return `${base}${subPart}${expPart}`;
    }
    case "fraction": {
      const num = mathToPlainText(node.numerator);
      const den = mathToPlainText(node.denominator);
      return `${paren(num, node.numerator)}/${paren(den, node.denominator)}`;
    }
    case "sqrt": {
      const rad = mathToPlainText(node.radicand);
      const inner = isSimpleAtom(node.radicand) ? rad : `(${rad})`;
      if (node.index) {
        const idx = mathToPlainText(node.index);
        const uni = mapScript(idx, SUPER);
        return `${uni || `(${idx})`}√${inner}`;
      }
      return `√${inner}`;
    }
    case "function": {
      const name = node.name || "";
      if (!node.argument) return name;
      return `${name}(${mathToPlainText(node.argument)})`;
    }
    case "nary": {
      const op = node.operator || "";
      const sub = node.sub ? mathToPlainText(node.sub) : "";
      const sup = node.sup ? mathToPlainText(node.sup) : "";
      const body = mathToPlainText(node.body);
      let limits = "";
      if (sub && sup) limits = `_{${sub}}^{${sup}}`;
      else if (sub) limits = `_{${sub}}`;
      else if (sup) limits = `^{${sup}}`;
      return `${op}${limits}${body ? ` ${body}` : ""}`;
    }
    case "accent": {
      const base = mathToPlainText(node.base);
      const mark = ACCENT_COMBINING[node.kind] || "\u0304";
      if (base.length === 1) return `${base}${mark}`;
      return `${base}${mark}`;
    }
    case "delimiter":
      return `${node.left || ""}${mathToPlainText(node.body)}${node.right || ""}`;
    case "matrix": {
      const rows = (node.rows || []).map((row) =>
        (row || []).map((cell) => mathToPlainText(cell)).join(", "),
      );
      const inner = rows.join("; ");
      const fences = matrixFences(node.kind);
      return `${fences[0]}${inner}${fences[1]}`;
    }
    case "failed":
      return String(node.source || "").replace(/^\$+|\$+$/g, "");
    default:
      return String(node.source || node.value || "");
  }
}

function wrapIfNeeded(node) {
  const text = mathToPlainText(node);
  if (node?.type === "fraction" || node?.type === "group" && (node.children || []).length > 1) {
    if (/[+\-−=]/.test(text)) return `(${text})`;
  }
  return text;
}

function paren(text, node) {
  if (!text) return "0";
  if (node?.type === "fraction") return `(${text})`;
  if (/[+\-−=]/.test(text)) return `(${text})`;
  return text;
}

function matrixFences(kind) {
  if (kind === "pmatrix") return ["(", ")"];
  if (kind === "bmatrix") return ["[", "]"];
  if (kind === "Bmatrix") return ["{", "}"];
  if (kind === "vmatrix") return ["|", "|"];
  return ["[", "]"];
}
