import { describe, expect, it } from "vitest";
import { parseLatex } from "../../src/parser/latex-parser.js";
import { containsFailed } from "../../src/model/math-ast.js";

function types(node) {
  if (!node) return [];
  const found = [node.type];
  for (const key of ["children", "base", "exponent", "sub", "sup", "numerator", "denominator", "radicand", "index", "body", "argument"]) {
    const value = node[key];
    if (Array.isArray(value)) found.push(...value.flatMap(types));
    else if (value && typeof value === "object") found.push(...types(value));
  }
  return found;
}

describe("LaTeX Math AST", () => {
  it("parses variables, numbers, and operators", () => {
    const ast = parseLatex("2x + 3");
    expect(ast.type).toBe("group");
    expect(ast.children[0]).toMatchObject({ type: "atom", kind: "number", value: "2" });
    expect(ast.children[1]).toMatchObject({ type: "atom", kind: "variable", value: "x" });
  });

  it("parses superscripts and subscripts", () => {
    expect(parseLatex("x^2").children[0].type).toBe("superscript");
    expect(parseLatex("x_i").children[0].type).toBe("subscript");
    expect(parseLatex("x_i^2").children[0].type).toBe("subsuperscript");
  });

  it("parses fractions", () => {
    const ast = parseLatex("\\frac{a}{b}");
    expect(ast.children[0].type).toBe("fraction");
  });

  it("parses square roots and n-th roots", () => {
    expect(parseLatex("\\sqrt{x}").children[0].type).toBe("sqrt");
    const nth = parseLatex("\\sqrt[n]{x}").children[0];
    expect(nth.type).toBe("sqrt");
    expect(nth.index).toBeTruthy();
  });

  it("parses Greek letters", () => {
    const ast = parseLatex("\\mu + \\sigma + \\Delta");
    expect(ast.children.map((c) => c.value).join("")).toBe("μ+σ+Δ");
  });

  it("parses \\text", () => {
    const ast = parseLatex("\\text{kg}");
    expect(ast.children[0]).toMatchObject({ type: "text", value: "kg" });
  });

  it("parses \\bar and \\hat", () => {
    expect(parseLatex("\\bar{x}").children[0]).toMatchObject({ type: "accent", kind: "bar" });
    expect(parseLatex("\\hat{x}").children[0]).toMatchObject({ type: "accent", kind: "hat" });
  });

  it("parses sums and integrals with limits", () => {
    const sum = parseLatex("\\sum_{i=1}^{n}x_i").children[0];
    expect(sum.type).toBe("nary");
    expect(sum.operator).toBe("∑");
    expect(sum.sub).toBeTruthy();
    expect(sum.sup).toBeTruthy();
    const integral = parseLatex("\\int_a^b f(x) dx").children[0];
    expect(integral.operator).toBe("∫");
  });

  it("parses functions and relations", () => {
    const ast = parseLatex("\\sin x \\neq \\cos y");
    expect(types(ast)).toContain("function");
    expect(JSON.stringify(ast)).toContain("≠");
  });

  it("parses \\implies and related arrows", () => {
    const ast = parseLatex("u(x) = x^{2} + 1 \\implies u'(x) = 2x");
    expect(ast.type).not.toBe("failed");
    expect(containsFailed(ast)).toBe(false);
    expect(JSON.stringify(ast)).toContain("⟹");
    expect(containsFailed(parseLatex("A \\iff B"))).toBe(false);
    expect(containsFailed(parseLatex("B \\impliedby A"))).toBe(false);
  });

  it("parses the sample mean formula", () => {
    const ast = parseLatex("\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n}x_i");
    expect(types(ast)).toEqual(expect.arrayContaining(["accent", "fraction", "nary"]));
    expect(ast.type).not.toBe("failed");
  });

  it("parses the standard deviation formula", () => {
    const ast = parseLatex("s = \\sqrt{\\frac{\\sum_{i=1}^{n}(x_i-\\bar{x})^2}{n-1}}");
    expect(types(ast)).toEqual(expect.arrayContaining(["sqrt", "fraction", "nary", "accent"]));
    expect(ast.type).not.toBe("failed");
  });

  it("parses a pmatrix", () => {
    const ast = parseLatex("\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}");
    expect(ast.children[0].type).toBe("matrix");
    expect(ast.children[0].kind).toBe("pmatrix");
    expect(ast.children[0].rows).toHaveLength(2);
  });

  it("preserves malformed input as a failed node", () => {
    const missing = parseLatex("\\frac{a}{");
    expect(missing.type).toBe("failed");
    expect(missing.source).toContain("\\frac");

    const unmatched = parseLatex("{a+b");
    expect(unmatched.type).toBe("failed");
  });

  it("renders unknown commands instead of failing the expression", () => {
    const unknown = parseLatex("x + \\notacommand{y}");
    expect(containsFailed(unknown)).toBe(false);
    expect(JSON.stringify(unknown)).toContain("notacommand");
    expect(JSON.stringify(unknown)).toContain("y");

    const kept = parseLatex("\\unknown{keep-me}");
    expect(containsFailed(kept)).toBe(false);
    expect(JSON.stringify(kept)).toContain("unknown");
    expect(JSON.stringify(kept)).toContain("\"k\"");
  });

  it("unwraps font commands and common AMS symbols", () => {
    const real = parseLatex("\\mathbb{R}");
    expect(containsFailed(real)).toBe(false);
    expect(JSON.stringify(real)).toContain("R");
    expect(containsFailed(parseLatex("a \\therefore b"))).toBe(false);
    expect(containsFailed(parseLatex("\\mathbb{E}[X]"))).toBe(false);
  });
});
