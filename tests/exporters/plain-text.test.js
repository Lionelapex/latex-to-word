import { describe, expect, it } from "vitest";
import { parseLatex } from "../../src/parser/latex-parser.js";
import { parseDocument } from "../../src/parser/index.js";
import { mathToPlainText } from "../../src/renderers/plain-text-renderer.js";
import { documentToPlainText } from "../../src/exporters/plain-text-exporter.js";
import { documentToDocxBuffer } from "../../src/exporters/docx-exporter.js";
import { unzipDocx, documentXml } from "../helpers/unzip.js";
import { assertWellFormedDocumentXml } from "../helpers/xml-assertions.js";

describe("mathToPlainText", () => {
  it("converts fractions, roots, and scripts to readable text", () => {
    expect(mathToPlainText(parseLatex("x^2"))).toBe("x²");
    expect(mathToPlainText(parseLatex("x_i"))).toBe("xᵢ");
    expect(mathToPlainText(parseLatex("\\frac{a}{b}"))).toBe("a/b");
    expect(mathToPlainText(parseLatex("\\sqrt{t}"))).toBe("√t");
    expect(mathToPlainText(parseLatex("\\frac{1}{2\\sqrt{t}}"))).toContain("√");
  });

  it("converts implies and Greek without leftover commands", () => {
    const text = mathToPlainText(parseLatex("u(x) = x^{2} + 1 \\implies u'(x) = 2x"));
    expect(text).toContain("⟹");
    expect(text).not.toContain("\\implies");
    expect(text).toContain("x²");
  });
});

describe("documentToPlainText", () => {
  it("keeps headings, lists, and tables while flattening math", () => {
    const doc = parseDocument(
      ["### Title", "", "1. $\\sqrt{t} + 2$", "", "| a | b |", "| --- | --- |", "| $x^2$ | 1 |"].join("\n"),
      { mode: "strict" },
    );
    const text = documentToPlainText(doc);
    expect(text).toContain("### Title");
    expect(text).toMatch(/1\. .*(√t|\√t)/);
    expect(text).toContain("|");
    expect(text).toContain("x²");
    expect(text).not.toContain("\\sqrt");
    expect(text).not.toContain("$$");
  });

  it("writes a Word document with real tables and plain-text math", async () => {
    const doc = parseDocument(
      ["### Title", "", "$x^2 + \\frac{a}{b}$", "", "| a | b |", "| --- | --- |", "| $x^2$ | $\\sqrt{t}$ |"].join("\n"),
      { mode: "strict" },
    );
    const xml = documentXml(await unzipDocx(await documentToDocxBuffer(doc, { mathMode: "plain" })));
    assertWellFormedDocumentXml(xml);
    expect(xml).toContain("w:tbl");
    expect(xml).toMatch(/Heading3|heading 3|Heading3/);
    expect(xml).not.toContain("m:oMath");
    expect(xml).not.toContain("\\frac");
    expect(xml).not.toContain("\\sqrt");
    expect(xml).toContain("x²");
    expect(xml).toContain("a/b");
    expect(xml).toContain("√t");
  });
});
