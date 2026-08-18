import { describe, expect, it } from "vitest";
import { findSmartMath, scoreMathSnippet } from "../../src/parser/math-detector.js";
import { parseDocument } from "../../src/parser/index.js";

describe("smart math detection", () => {
  it("detects obvious LaTeX commands", () => {
    expect(scoreMathSnippet("\\frac{a}{b}")).toBeGreaterThanOrEqual(0.7);
    expect(findSmartMath("See \\sqrt{x} here.")[0].source).toContain("\\sqrt");
    expect(findSmartMath("mean \\bar{x} = 1.135")[0].source).toContain("\\bar");
  });

  it("detects Greek and simple scripts", () => {
    expect(findSmartMath("parameter \\mu in the model").length).toBeGreaterThan(0);
    expect(findSmartMath("index x_i next").length).toBeGreaterThan(0);
  });

  it("does not convert Windows paths or ordinary text", () => {
    expect(findSmartMath("C:\\Documents\\Statistics").length).toBe(0);
    expect(findSmartMath("Use file_name in the table.").length).toBe(0);
    expect(findSmartMath("See [1] for details.").length).toBe(0);
  });

  it("is skipped in strict mode", () => {
    const smart = parseDocument("The mean is \\bar{x}.", { mode: "smart" });
    const strict = parseDocument("The mean is \\bar{x}.", { mode: "strict" });
    const count = (doc) => doc.blocks.flatMap((b) => b.inlines || []).filter((n) => n.type === "math").length;
    expect(count(smart)).toBeGreaterThan(0);
    expect(count(strict)).toBe(0);
  });
});
