import { describe, expect, it } from "vitest";
import { parseDocument } from "../../src/parser/index.js";
import { documentToDocxBuffer } from "../../src/exporters/docx-exporter.js";
import { unzipDocx, documentXml } from "../helpers/unzip.js";
import { assertWellFormedDocumentXml, expectOmmlElements } from "../helpers/xml-assertions.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fixtureDir = dirname(fileURLToPath(import.meta.url));

describe("DOCX export", () => {
  it("produces a zip with document.xml and content types", async () => {
    const model = parseDocument("# Title\n\nHello $x_i$ world.\n\n\\[\\frac{a}{b}\\]", { mode: "strict" });
    const buffer = await documentToDocxBuffer(model);
    const files = await unzipDocx(buffer);
    expect(files["[Content_Types].xml"]).toBeTruthy();
    expect(files["word/document.xml"]).toBeTruthy();
    const xml = documentXml(files);
    assertWellFormedDocumentXml(xml);
    expectOmmlElements(xml, ["w:document", "w:p", "m:oMath", "m:f"]);
  });

  it("maps headings to Word heading styles", async () => {
    const model = parseDocument("## Section", { mode: "strict" });
    const files = await unzipDocx(await documentToDocxBuffer(model));
    assertWellFormedDocumentXml(documentXml(files));
    expect(documentXml(files)).toMatch(/Heading2|heading 2|Heading2/);
  });

  it("embeds tables and lists", async () => {
    const input = `- one\n- two\n\n| A | B |\n| --- | --- |\n| $1$ | $2$ |`;
    const model = parseDocument(input, { mode: "strict" });
    const xml = documentXml(await unzipDocx(await documentToDocxBuffer(model)));
    assertWellFormedDocumentXml(xml);
    expect(xml).toContain("w:tbl");
    expect(xml).toContain("w:numPr");
    expect(xml).toContain("m:oMath");
  });

  it("exports realistic statistics content without invalid OMML wrappers", async () => {
    const input = readFileSync(join(fixtureDir, "../fixtures/statistics.md"), "utf8");
    const model = parseDocument(input, { mode: "strict" });
    const xml = documentXml(await unzipDocx(await documentToDocxBuffer(model)));
    assertWellFormedDocumentXml(xml);
    expectOmmlElements(xml, ["m:acc", "m:f", "m:nary", "m:rad", "w:tbl"]);
  });
});
