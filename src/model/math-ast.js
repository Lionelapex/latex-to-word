export function atom(kind, value) {
  return { type: "atom", kind, value };
}

export function group(children = []) {
  return { type: "group", children: Array.isArray(children) ? children : [children] };
}

export function superscript(base, exponent) {
  return { type: "superscript", base, exponent };
}

export function subscript(base, sub) {
  return { type: "subscript", base, sub };
}

export function subsuperscript(base, sub, sup) {
  return { type: "subsuperscript", base, sub, sup };
}

export function fraction(numerator, denominator) {
  return { type: "fraction", numerator, denominator };
}

export function sqrt(radicand, index = null) {
  return { type: "sqrt", radicand, index };
}

export function text(value) {
  return { type: "text", value };
}

export function func(name, argument = null) {
  return { type: "function", name, argument };
}

export function nary(operator, { sub = null, sup = null, body = null, limitStyle = "undOvr" } = {}) {
  return { type: "nary", operator, sub, sup, body, limitStyle };
}

export function accent(kind, base) {
  return { type: "accent", kind, base };
}

export function delimiter(left, right, body) {
  return { type: "delimiter", left, right, body };
}

export function matrix(kind, rows) {
  return { type: "matrix", kind, rows };
}

export function failed(source, message = "Could not parse LaTeX") {
  return { type: "failed", source, message };
}

export function wrap(node) {
  if (!node) return group([]);
  if (node.type === "group") return node;
  return group([node]);
}

export function unwrap(node) {
  if (node && node.type === "group" && node.children.length === 1) {
    return node.children[0];
  }
  return node;
}

function visitChild(value, fn) {
  if (!value) return false;
  if (Array.isArray(value)) return value.some((item) => containsFailed(item) || visitChild(item, fn));
  if (typeof value === "object" && value.type) return fn(value);
  return false;
}

export function containsFailed(node) {
  if (!node) return false;
  if (node.type === "failed") return true;
  const keys = [
    "children",
    "base",
    "exponent",
    "sub",
    "sup",
    "numerator",
    "denominator",
    "radicand",
    "index",
    "argument",
    "body",
    "rows",
  ];
  for (const key of keys) {
    if (visitChild(node[key], containsFailed)) return true;
  }
  return false;
}

export function walkMath(node, visitor) {
  if (!node) return;
  visitor(node);
  const keys = [
    "children",
    "base",
    "exponent",
    "sub",
    "sup",
    "numerator",
    "denominator",
    "radicand",
    "index",
    "argument",
    "body",
    "rows",
  ];
  for (const key of keys) {
    const value = node[key];
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (Array.isArray(item)) {
          item.forEach((cell) => walkMath(cell, visitor));
        } else {
          walkMath(item, visitor);
        }
      }
    } else if (typeof value === "object") {
      walkMath(value, visitor);
    }
  }
}
