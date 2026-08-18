import { describe, expect, it } from "vitest";
import { parseDocument } from "../../src/parser/index.js";
import { toMathMLString } from "../../src/renderers/mathml-renderer.js";

describe("MathML preview strings", () => {
  it("emits mfrac and msqrt from the AST", () => {
    const doc = parseDocument("$\\frac{a}{\\sqrt{n}}$", { mode: "strict" });
    const math = doc.blocks[0].inlines.find((n) => n.type === "math");
    const xml = toMathMLString(math.ast);
    expect(xml).toContain("<mfrac>");
    expect(xml).toContain("<msqrt>");
  });

  it("marks failed math without dropping the source", () => {
    const doc = parseDocument("$\\frac{a}{$", { mode: "strict" });
    const math = doc.blocks[0].inlines.find((n) => n.type === "math") || doc.blocks.find((b) => b.type === "math");
    expect(math.ast.type).toBe("failed");
    expect(toMathMLString(math.ast)).toContain("\\frac");
  });
});
