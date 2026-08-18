import { describe, expect, it } from "vitest";
import { parseLatex } from "../../src/parser/latex-parser.js";
import { toOmmlXml, astToInlineMath } from "../../src/renderers/omml-renderer.js";
import { Document, Packer, Paragraph } from "docx";
import { unzipDocx, documentXml } from "../helpers/unzip.js";
import { assertWellFormedDocumentXml } from "../helpers/xml-assertions.js";

async function packedXml(latex) {
  const ast = parseLatex(latex);
  const doc = new Document({
    sections: [{ children: [new Paragraph({ children: [astToInlineMath(ast)] })] }],
  });
  const buffer = await Packer.toBuffer(doc);
  const files = await unzipDocx(buffer);
  return documentXml(files);
}

describe("OMML structure", () => {
  it("emits a fraction as m:f", async () => {
    const xml = await packedXml("\\frac{a}{b}");
    assertWellFormedDocumentXml(xml);
    expect(xml).toContain("m:f");
    expect(xml).toContain("m:num");
    expect(xml).toContain("m:den");
    expect(toOmmlXml(parseLatex("\\frac{a}{b}"))).toContain("m:f");
  });

  it("emits sub+sup as m:sSubSup", async () => {
    const xml = await packedXml("x_i^2");
    assertWellFormedDocumentXml(xml);
    expect(xml).toMatch(/m:sSubSup|sSubSup/);
  });

  it("emits a radical as m:rad", async () => {
    const xml = await packedXml("\\sqrt{x}");
    assertWellFormedDocumentXml(xml);
    expect(xml).toContain("m:rad");
  });

  it("emits a sum as m:nary", async () => {
    const xml = await packedXml("\\sum_{i=1}^{n}x_i");
    assertWellFormedDocumentXml(xml);
    expect(xml).toContain("m:nary");
  });

  it("uses the raw XML escape hatch for hat and matrices", async () => {
    const hat = await packedXml("\\hat{x}");
    assertWellFormedDocumentXml(hat);
    expect(hat).toContain("m:acc");
    expect(hat).not.toContain("<undefined>");

    const matrix = await packedXml("\\begin{pmatrix}a & b\\\\c & d\\end{pmatrix}");
    assertWellFormedDocumentXml(matrix);
    expect(matrix).toContain("m:m");
    expect(matrix).not.toContain("<undefined>");
  });

  it("keeps failed LaTeX source inside OMML", async () => {
    const xml = await packedXml("\\frac{a}{");
    assertWellFormedDocumentXml(xml);
    expect(xml).toContain("\\frac");
  });
});
