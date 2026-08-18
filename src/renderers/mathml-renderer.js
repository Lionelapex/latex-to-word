import { escapeXml } from "../utils/xml.js";

export const MATHNS = "http://www.w3.org/1998/Math/MathML";

export function toMathMLString(ast, { display = false } = {}) {
  const inner = serialize(ast);
  const displayAttr = display ? ' display="block"' : "";
  return `<math xmlns="${MATHNS}"${displayAttr}>${inner}</math>`;
}

export function appendMathML(parent, ast, { display = false, document: doc = parent?.ownerDocument || globalThis.document } = {}) {
  if (!doc?.createElementNS) {
    const fallback = doc?.createElement?.("span") || parent;
    fallback.textContent = ast?.type === "failed" ? ast.source : "";
    parent.appendChild(fallback);
    return;
  }
  const math = doc.createElementNS(MATHNS, "math");
  if (display) math.setAttribute("display", "block");
  appendAst(math, ast, doc);
  parent.appendChild(math);
}

function el(doc, name, children = [], attrs = {}) {
  const node = doc.createElementNS(MATHNS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null && value !== "") node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child) node.appendChild(child);
  }
  return node;
}

function textEl(doc, name, value, attrs) {
  const node = el(doc, name, [], attrs);
  node.textContent = value ?? "";
  return node;
}

function appendAst(parent, node, doc) {
  const built = build(node, doc);
  if (Array.isArray(built)) built.forEach((item) => item && parent.appendChild(item));
  else if (built) parent.appendChild(built);
}

function build(node, doc) {
  if (!node) return null;
  switch (node.type) {
    case "group":
      return el(doc, "mrow", (node.children || []).map((child) => build(child, doc)));
    case "atom":
      return buildAtom(node, doc);
    case "text":
      return textEl(doc, "mtext", node.value);
    case "superscript":
      return el(doc, "msup", [build(node.base, doc), build(node.exponent, doc)]);
    case "subscript":
      return el(doc, "msub", [build(node.base, doc), build(node.sub, doc)]);
    case "subsuperscript":
      return el(doc, "msubsup", [build(node.base, doc), build(node.sub, doc), build(node.sup, doc)]);
    case "fraction":
      return el(doc, "mfrac", [build(node.numerator, doc), build(node.denominator, doc)]);
    case "sqrt":
      if (node.index) return el(doc, "mroot", [build(node.radicand, doc), build(node.index, doc)]);
      return el(doc, "msqrt", [build(node.radicand, doc)]);
    case "function":
      return el(doc, "mrow", [
        textEl(doc, "mi", node.name, { mathvariant: "normal" }),
        node.argument ? build(node.argument, doc) : null,
      ]);
    case "nary":
      return buildNary(node, doc);
    case "accent":
      return el(doc, "mover", [build(node.base, doc), textEl(doc, "mo", accentChar(node.kind))]);
    case "delimiter":
      return el(doc, "mrow", [
        node.left ? textEl(doc, "mo", node.left, { fence: "true" }) : null,
        build(node.body, doc),
        node.right ? textEl(doc, "mo", node.right, { fence: "true" }) : null,
      ]);
    case "matrix":
      return buildMatrix(node, doc);
    case "failed": {
      const text = textEl(doc, "mtext", node.source || "");
      text.setAttribute("class", "math-failed");
      return text;
    }
    default:
      return textEl(doc, "mtext", node.source || "");
  }
}

function buildAtom(node, doc) {
  if (!node.value) return null;
  if (node.kind === "number") return textEl(doc, "mn", node.value);
  if (node.kind === "operator" || node.kind === "symbol") return textEl(doc, "mo", node.value);
  if (node.kind === "function") return textEl(doc, "mi", node.value, { mathvariant: "normal" });
  return textEl(doc, "mi", node.value);
}

function buildNary(node, doc) {
  const op =
    node.operator.length > 1
      ? textEl(doc, "mi", node.operator, { mathvariant: "normal" })
      : textEl(doc, "mo", node.operator);
  const underOver = node.limitStyle === "undOvr";
  let core = op;
  if (node.sub && node.sup) {
    core = el(doc, underOver ? "munderover" : "msubsup", [op, build(node.sub, doc), build(node.sup, doc)]);
  } else if (node.sub) {
    core = el(doc, underOver ? "munder" : "msub", [op, build(node.sub, doc)]);
  } else if (node.sup) {
    core = el(doc, underOver ? "mover" : "msup", [op, build(node.sup, doc)]);
  }
  return el(doc, "mrow", [core, build(node.body, doc)]);
}

function buildMatrix(node, doc) {
  const rows = (node.rows || []).map((row) =>
    el(
      doc,
      "mtr",
      row.map((cell) => el(doc, "mtd", [build(cell, doc)])),
    ),
  );
  const table = el(doc, "mtable", rows);
  const fences = matrixFences(node.kind);
  if (!fences) return table;
  return el(doc, "mrow", [
    textEl(doc, "mo", fences[0], { fence: "true" }),
    table,
    textEl(doc, "mo", fences[1], { fence: "true" }),
  ]);
}

function serialize(node) {
  if (!node) return "";
  switch (node.type) {
    case "group":
      return `<mrow>${(node.children || []).map(serialize).join("")}</mrow>`;
    case "atom":
      return serializeAtom(node);
    case "text":
      return `<mtext>${escapeXml(node.value)}</mtext>`;
    case "superscript":
      return `<msup>${serialize(node.base)}${serialize(node.exponent)}</msup>`;
    case "subscript":
      return `<msub>${serialize(node.base)}${serialize(node.sub)}</msub>`;
    case "subsuperscript":
      return `<msubsup>${serialize(node.base)}${serialize(node.sub)}${serialize(node.sup)}</msubsup>`;
    case "fraction":
      return `<mfrac>${serialize(node.numerator)}${serialize(node.denominator)}</mfrac>`;
    case "sqrt":
      if (node.index) return `<mroot>${serialize(node.radicand)}${serialize(node.index)}</mroot>`;
      return `<msqrt>${serialize(node.radicand)}</msqrt>`;
    case "function":
      return `<mrow><mi mathvariant="normal">${escapeXml(node.name)}</mi>${node.argument ? serialize(node.argument) : ""}</mrow>`;
    case "nary":
      return serializeNary(node);
    case "accent":
      return `<mover>${serialize(node.base)}<mo>${escapeXml(accentChar(node.kind))}</mo></mover>`;
    case "delimiter": {
      const left = node.left ? `<mo fence="true">${escapeXml(node.left)}</mo>` : "";
      const right = node.right ? `<mo fence="true">${escapeXml(node.right)}</mo>` : "";
      return `<mrow>${left}${serialize(node.body)}${right}</mrow>`;
    }
    case "matrix":
      return serializeMatrix(node);
    case "failed":
      return `<mtext class="math-failed">${escapeXml(node.source || "")}</mtext>`;
    default:
      return `<mtext>${escapeXml(node.source || "")}</mtext>`;
  }
}

function serializeAtom(node) {
  if (!node.value) return "";
  if (node.kind === "number") return `<mn>${escapeXml(node.value)}</mn>`;
  if (node.kind === "operator" || node.kind === "symbol") return `<mo>${escapeXml(node.value)}</mo>`;
  if (node.kind === "function") return `<mi mathvariant="normal">${escapeXml(node.value)}</mi>`;
  return `<mi>${escapeXml(node.value)}</mi>`;
}

function serializeNary(node) {
  const op =
    node.operator.length > 1
      ? `<mi mathvariant="normal">${escapeXml(node.operator)}</mi>`
      : `<mo>${escapeXml(node.operator)}</mo>`;
  const underOver = node.limitStyle === "undOvr";
  if (node.sub && node.sup) {
    const tag = underOver ? "munderover" : "msubsup";
    return `<${tag}>${op}${serialize(node.sub)}${serialize(node.sup)}</${tag}>${serialize(node.body)}`;
  }
  if (node.sub) {
    const tag = underOver ? "munder" : "msub";
    return `<${tag}>${op}${serialize(node.sub)}</${tag}>${serialize(node.body)}`;
  }
  if (node.sup) {
    const tag = underOver ? "mover" : "msup";
    return `<${tag}>${op}${serialize(node.sup)}</${tag}>${serialize(node.body)}`;
  }
  return `<mrow>${op}${serialize(node.body)}</mrow>`;
}

function serializeMatrix(node) {
  const rows = (node.rows || [])
    .map((row) => `<mtr>${row.map((cell) => `<mtd>${serialize(cell)}</mtd>`).join("")}</mtr>`)
    .join("");
  const table = `<mtable>${rows}</mtable>`;
  const fences = matrixFences(node.kind);
  if (!fences) return table;
  return `<mrow><mo fence="true">${escapeXml(fences[0])}</mo>${table}<mo fence="true">${escapeXml(fences[1])}</mo></mrow>`;
}

function matrixFences(kind) {
  if (kind === "pmatrix") return ["(", ")"];
  if (kind === "bmatrix") return ["[", "]"];
  if (kind === "Bmatrix") return ["{", "}"];
  if (kind === "vmatrix") return ["|", "|"];
  return null;
}

function accentChar(kind) {
  if (kind === "hat") return "^";
  if (kind === "vec") return "→";
  if (kind === "tilde") return "~";
  if (kind === "dot") return "˙";
  if (kind === "ddot") return "¨";
  return "¯";
}
