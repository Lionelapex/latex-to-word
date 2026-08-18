import { describe, expect, it } from "vitest";
import { parseDocument } from "../../src/parser/index.js";
import { htmlToMarkdown, normalizePastedContent, normalizePlainTableSource } from "../../src/parser/table-normalizer.js";
import { renderToFragmentHTML } from "../../src/renderers/html-renderer.js";
import { documentToDocxBuffer } from "../../src/exporters/docx-exporter.js";
import { unzipDocx, documentXml } from "../helpers/unzip.js";

function cellText(cell) {
  return (cell.inlines || [])
    .map((node) => {
      if (node.type === "text") return node.value;
      if (node.type === "math") return `$${node.source}$`;
      if (node.type === "strong") return cellText({ inlines: node.children });
      if (node.type === "emphasis") return cellText({ inlines: node.children });
      return "";
    })
    .join("");
}

function firstTable(doc) {
  return doc.blocks.find((block) => block.type === "table");
}

describe("table paste and reconstruction", () => {
  it("parses a GFM table with inline $\\mu$ in a cell", () => {
    const input = `| Variable | Symbol |\n| --- | --- |\n| mean | $\\mu$ |`;
    const doc = parseDocument(input, { mode: "strict" });
    const table = firstTable(doc);
    expect(table).toBeTruthy();
    expect(table.header).toHaveLength(2);
    expect(cellText(table.header[0])).toBe("Variable");
    expect(table.rows[0][1].inlines.some((n) => n.type === "math" && n.source === "\\mu")).toBe(true);
  });

  it("converts an HTML <table> paste into a document-model table", () => {
    const html = `<html><body><!--StartFragment-->
<h3>1.4 Coffee Creamer Case Study</h3>
<table>
  <thead>
    <tr>
      <th>Question</th>
      <th>Description</th>
      <th>Symbol</th>
      <th>Value / Expression</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1.4.1</td>
      <td>Random variable of interest</td>
      <td>$X$</td>
      <td>Weight of a jar of coffee creamer</td>
    </tr>
    <tr>
      <td>1.4.2</td>
      <td>Population mean</td>
      <td>$\\mu$</td>
      <td>$1.000$ kg</td>
    </tr>
  </tbody>
</table>
<!--EndFragment--></body></html>`;
    const stackedPlain = [
      "Question",
      "Description",
      "Symbol",
      "Value / Expression",
      "1.4.1",
      "Random variable of interest",
      "$X$",
      "Weight of a jar of coffee creamer",
    ].join("\n");

    const markdown = normalizePastedContent({ html, text: stackedPlain });
    expect(markdown).toContain("| Question | Description | Symbol | Value / Expression |");
    expect(markdown).toContain("| --- | --- | --- | --- |");
    expect(markdown).toContain("| 1.4.1 | Random variable of interest | $X$ |");

    const doc = parseDocument(markdown, { mode: "strict" });
    const table = firstTable(doc);
    expect(table).toBeTruthy();
    expect(table.header.map(cellText)).toEqual(["Question", "Description", "Symbol", "Value / Expression"]);
    expect(table.rows).toHaveLength(2);
    expect(cellText(table.rows[0][0])).toBe("1.4.1");
    expect(table.rows[0][2].inlines.some((n) => n.type === "math" && n.source === "X")).toBe(true);
    expect(table.rows[1][2].inlines.some((n) => n.type === "math" && n.source === "\\mu")).toBe(true);
  });

  it("parses a TSV two-row table", () => {
    const input = "Name\tValue\nmu\t$\\mu$";
    const doc = parseDocument(input, { mode: "strict" });
    const table = firstTable(doc);
    expect(table).toBeTruthy();
    expect(table.header.map(cellText)).toEqual(["Name", "Value"]);
    expect(table.rows).toHaveLength(1);
    expect(cellText(table.rows[0][0])).toBe("mu");
    expect(table.rows[0][1].inlines.some((n) => n.type === "math" && n.source === "\\mu")).toBe(true);
  });

  it("reconstructs a pipe table without a GFM separator row", () => {
    const input = `Question | Description | Symbol | Value
1.4.1 | Random variable of interest | $X$ | Weight of a jar of coffee creamer`;
    const doc = parseDocument(input, { mode: "strict" });
    const table = firstTable(doc);
    expect(table).toBeTruthy();
    expect(table.header).toHaveLength(4);
    expect(table.rows).toHaveLength(1);
    expect(cellText(table.rows[0][0])).toBe("1.4.1");
    expect(table.rows[0][2].inlines.some((n) => n.type === "math" && n.source === "X")).toBe(true);
    expect(cellText(table.rows[0][3])).toMatch(/Weight of a jar/);
  });

  it("reconstructs ChatGPT stacked one-cell-per-line dumps conservatively", () => {
    const input = `## 1.4 Coffee Creamer Case Study

Question
Description
Symbol
Value / Expression
1.4.1
Random variable of interest
$X$
Weight of a jar of coffee creamer
1.4.2
Population mean
$\\mu$
$1.000$ kg`;
    const doc = parseDocument(input, { mode: "strict" });
    const table = firstTable(doc);
    expect(table).toBeTruthy();
    expect(table.header.map(cellText)).toEqual(["Question", "Description", "Symbol", "Value / Expression"]);
    expect(table.rows).toHaveLength(2);
    expect(cellText(table.rows[0][1])).toBe("Random variable of interest");
    expect(table.rows[1][2].inlines.some((n) => n.type === "math" && n.source === "\\mu")).toBe(true);
  });

  it("does not turn ordinary lists or short paragraphs into tables", () => {
    const list = parseDocument("- first\n- second\n- third\n- fourth", { mode: "strict" });
    expect(list.blocks.some((b) => b.type === "table")).toBe(false);
    expect(list.blocks[0].type).toBe("list");

    const prose = parseDocument("Hello world this is a paragraph\nthat wraps onto the next line\nand continues here.", {
      mode: "strict",
    });
    expect(prose.blocks.some((b) => b.type === "table")).toBe(false);

    const groceries = parseDocument("Milk\nBread\nEggs\nButter", { mode: "strict" });
    expect(groceries.blocks.some((b) => b.type === "table")).toBe(false);
  });

  it("renders preview HTML as a bordered table with a header row", () => {
    const doc = parseDocument(
      `Question | Description | Symbol | Value
1.4.1 | Random variable of interest | $X$ | Weight of a jar`,
      { mode: "strict" },
    );
    const html = renderToFragmentHTML(doc);
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
    expect(html).toContain("border:1px solid");
    expect(html).not.toMatch(/<p>Question Description Symbol Value/);
  });

  it("exports native Word tables with inline OMML in cells", async () => {
    const doc = parseDocument(
      `| Variable | Symbol |\n| --- | --- |\n| mean | $\\mu$ |`,
      { mode: "strict" },
    );
    const xml = documentXml(await unzipDocx(await documentToDocxBuffer(doc)));
    expect(xml).toContain("w:tbl");
    expect(xml).toContain("m:oMath");
  });

  it("extracts TeX from HTML math annotations inside table cells", () => {
    const html = `<table><tr><th>Symbol</th><th>Value</th></tr>
<tr><td><annotation encoding="application/x-tex">\\mu</annotation></td><td>1</td></tr></table>`;
    const markdown = htmlToMarkdown(html);
    expect(markdown).toContain("$\\mu$");
    const doc = parseDocument(markdown, { mode: "strict" });
    const table = firstTable(doc);
    expect(table.rows[0][0].inlines.some((n) => n.type === "math" && n.source === "\\mu")).toBe(true);
  });

  it("does not duplicate TeX when a cell has MathML annotation plus a visible HTML twin", () => {
    const html = `<table><tr><th>Symbol</th><th>Value</th></tr>
<tr>
  <td>
    <span class="katex">
      <span class="katex-mathml">
        <math xmlns="http://www.w3.org/1998/Math/MathML">
          <semantics>
            <mrow><mi>X</mi></mrow>
            <annotation encoding="application/x-tex">X</annotation>
          </semantics>
        </math>
      </span>
      <span class="katex-html" aria-hidden="true"><span class="mord mathnormal">X</span></span>
    </span>
  </td>
  <td>
    <span class="katex">
      <span class="katex-mathml">
        <math>
          <semantics>
            <mrow><mi>μ</mi><mo>=</mo><mn>1.000</mn><mtext> kg</mtext></mrow>
            <annotation encoding="application/x-tex">\\mu = 1.000\\text{ kg}</annotation>
          </semantics>
        </math>
      </span>
      <span class="katex-html" aria-hidden="true">μ=1.000 kg</span>
    </span>
  </td>
</tr>
<tr>
  <td>
    <span class="katex">
      <span class="katex-mathml">
        <math><semantics><mrow><mi>μ</mi></mrow>
        <annotation encoding="application/x-tex">\\mu</annotation></semantics></math>
      </span>
      <span class="katex-html" aria-hidden="true">μ</span>
    </span>
  </td>
  <td>Random variable of interest</td>
</tr>
</table>`;
    const markdown = htmlToMarkdown(html);
    expect(markdown).toMatch(/\| \$X\$ \|/);
    expect(markdown).not.toContain("$X$X");
    expect(markdown).toContain("$\\mu = 1.000\\text{ kg}$");
    expect(markdown).not.toMatch(/\$\\mu = 1\.000\\text\{ kg\}\$.*μ/);
    expect(markdown).toMatch(/\| \$\\mu\$ \| Random variable of interest \|/);
    expect(markdown).not.toContain("$\\mu$μ");

    const doc = parseDocument(markdown, { mode: "strict" });
    const table = firstTable(doc);
    expect(table.rows[0][0].inlines.filter((n) => n.type === "math")).toHaveLength(1);
    expect(table.rows[0][0].inlines.some((n) => n.type === "math" && n.source === "X")).toBe(true);
    expect(cellText(table.rows[0][0])).toBe("$X$");
    expect(table.rows[0][1].inlines.some((n) => n.type === "math" && n.source === "\\mu = 1.000\\text{ kg}")).toBe(true);
    expect(cellText(table.rows[0][1])).not.toMatch(/kg.*kg/);
    expect(cellText(table.rows[1][1])).toBe("Random variable of interest");
  });

  it("extracts MathJax math/tex scripts and skips the preview twin", () => {
    const html = `<table><tr><th>Symbol</th><th>Value</th></tr>
<tr>
  <td>
    <span class="MathJax_Preview">N</span>
    <script type="math/tex">N</script>
    <span class="MathJax">N</span>
  </td>
  <td>
    <span class="MathJax_Preview">N=13,335 jars</span>
    <script type="math/tex">N = 13,335</script>
    <span class="MathJax">N=13,335</span> jars
  </td>
</tr>
<tr>
  <td data-latex="\\bar{x}">x̄</td>
  <td><span data-original="\\bar{x}">x^-</span></td>
</tr>
</table>`;
    const markdown = htmlToMarkdown(html);
    expect(markdown).toMatch(/\| \$N\$ \|/);
    expect(markdown).not.toContain("$N$N");
    expect(markdown).toContain("$N = 13,335$");
    expect(markdown).toMatch(/jars/);
    expect(markdown).not.toMatch(/\$N = 13,335\$.*N=13,335/);
    expect(markdown).toContain("$\\bar{x}$");
    expect(markdown).not.toContain("$\\bar{x}$$x^-");
    expect(markdown).not.toMatch(/\$\\bar\{x\}\$x/);

    const doc = parseDocument(markdown, { mode: "strict" });
    const table = firstTable(doc);
    expect(table.rows[0][0].inlines.some((n) => n.type === "math" && n.source === "N")).toBe(true);
    expect(cellText(table.rows[0][0])).toBe("$N$");
    expect(table.rows[0][1].inlines.some((n) => n.type === "math" && n.source === "N = 13,335")).toBe(true);
    expect(cellText(table.rows[0][1])).toMatch(/jars/);
    expect(table.rows[1][0].inlines.some((n) => n.type === "math" && n.source === "\\bar{x}")).toBe(true);
  });

  it("dedupes already-pasted GFM cells like $X$X without re-copying HTML", () => {
    const input = `| Question | Description | Symbol | Value / Expression |
| --- | --- | --- | --- |
| 1.4.1 | Random variable of interest | $X$X | Weight of a jar |
| 1.4.2 | Population mean | $\\mu$\\mu | $\\mu = 1.000\\text{ kg}$$\\mu=1.000 kg |
| 1.4.3 | Sample size | $N$N | $N = 13,335$N=13,335 jars |
| 1.4.4 | Sample mean | $\\bar{x}$$x^-$ | $\\bar{x}$\\bar{x} |`;
    const markdown = normalizePlainTableSource(input);
    expect(markdown).toContain("| $X$ |");
    expect(markdown).not.toContain("$X$X");
    expect(markdown).toContain("$\\mu$");
    expect(markdown).not.toContain("$\\mu$\\mu");
    expect(markdown).toContain("$\\mu = 1.000\\text{ kg}$");
    expect(markdown).not.toContain("$\\mu=1.000 kg");
    expect(markdown).toContain("$N = 13,335$");
    expect(markdown).toContain("jars");
    expect(markdown).not.toMatch(/\$N = 13,335\$N=13,335/);
    expect(markdown).toContain("$\\bar{x}$");
    expect(markdown).not.toContain("$x^-$");

    const doc = parseDocument(input, { mode: "strict" });
    const table = firstTable(doc);
    expect(table.rows[0][2].inlines.filter((n) => n.type === "math")).toHaveLength(1);
    expect(table.rows[0][2].inlines.some((n) => n.type === "math" && n.source === "X")).toBe(true);
    expect(cellText(table.rows[0][2])).toBe("$X$");
    expect(cellText(table.rows[0][1])).toBe("Random variable of interest");
    expect(table.rows[1][2].inlines.some((n) => n.type === "math" && n.source === "\\mu")).toBe(true);
    expect(table.rows[1][3].inlines.some((n) => n.type === "math" && n.source === "\\mu = 1.000\\text{ kg}")).toBe(true);
    expect(cellText(table.rows[1][3])).not.toMatch(/kg.*kg/);
    expect(table.rows[2][3].inlines.some((n) => n.type === "math" && n.source === "N = 13,335")).toBe(true);
    expect(cellText(table.rows[2][3])).toMatch(/jars/);
    expect(table.rows[3][2].inlines.some((n) => n.type === "math" && n.source === "\\bar{x}")).toBe(true);
    expect(cellText(table.rows[3][2])).toBe("$\\bar{x}$");
  });

  it("prefers existing GFM in text/plain over HTML conversion", () => {
    const html = `<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>`;
    const text = `| A | B |\n| --- | --- |\n| keep | me |`;
    const markdown = normalizePastedContent({ html, text });
    expect(markdown).toContain("| keep | me |");
    expect(markdown).not.toContain("| 1 | 2 |");
  });

  it("leaves fenced code tables untouched", () => {
    const input = "```\nQuestion\nDescription\nSymbol\nValue / Expression\n1.4.1\nRandom variable of interest\n$X$\nWeight\n```";
    const normalized = normalizePlainTableSource(input);
    expect(normalized).toBe(input);
    const doc = parseDocument(input, { mode: "strict" });
    expect(doc.blocks[0].type).toBe("code");
    expect(doc.blocks.some((b) => b.type === "table")).toBe(false);
  });
});
