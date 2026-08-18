import { describe, expect, it } from "vitest";
import { parseDocument } from "../../src/parser/index.js";
import { renderToFragmentHTML } from "../../src/renderers/html-renderer.js";
import { documentToDocxBuffer } from "../../src/exporters/docx-exporter.js";
import { unzipDocx, documentXml } from "../helpers/unzip.js";

describe("document model", () => {
  it("parses paragraphs and ATX headings", () => {
    const doc = parseDocument("# Title\n\nHello world.\n\n## Sub", { mode: "strict" });
    expect(doc.blocks[0]).toMatchObject({ type: "heading", level: 1 });
    expect(doc.blocks[0].inlines[0].value).toBe("Title");
    expect(doc.blocks[1].type).toBe("paragraph");
    expect(doc.blocks[1].inlines[0].value).toBe("Hello world.");
    expect(doc.blocks[2]).toMatchObject({ type: "heading", level: 2 });
  });

  it("parses bold and italic", () => {
    const doc = parseDocument("This is **bold** and *italic* and ***both***.", { mode: "strict" });
    const types = doc.blocks[0].inlines.map((n) => n.type);
    expect(types).toContain("strong");
    expect(types).toContain("emphasis");
  });

  it("extracts ChatGPT display math \\[ \\]", () => {
    const doc = parseDocument("Before\n\n\\[P(E)=\\frac{a}{b}\\]\n\nAfter", { mode: "strict" });
    const math = doc.blocks.find((b) => b.type === "math");
    expect(math.display).toBe(true);
    expect(math.source).toContain("\\frac");
    expect(math.ast.type).not.toBe("failed");
  });

  it("extracts $$ display math", () => {
    const doc = parseDocument("$$x^2$$", { mode: "strict" });
    expect(doc.blocks[0].type).toBe("math");
    expect(doc.blocks[0].display).toBe(true);
  });

  it("extracts inline \\( \\) and $ $ math", () => {
    const doc = parseDocument("The probability is \\(P(E)\\) and also $n$.", { mode: "strict" });
    const math = doc.blocks[0].inlines.filter((n) => n.type === "math");
    expect(math).toHaveLength(2);
    expect(math.every((n) => n.display === false)).toBe(true);
  });

  it("converts conservative own-line [ ] display math", () => {
    const input = "Intro\n\n[\nP(E) = \\frac{n(E)}{n(S)}\n]\n\nOutro";
    const doc = parseDocument(input, { mode: "strict" });
    const math = doc.blocks.find((b) => b.type === "math");
    expect(math).toBeTruthy();
    expect(math.display).toBe(true);
    expect(math.source).toContain("\\frac");
  });

  it("does not treat citations or markdown links as math", () => {
    const doc = parseDocument("See [1] and [example](https://example.com).", { mode: "strict" });
    const math = doc.blocks.flatMap((b) => b.inlines || []).filter((n) => n.type === "math");
    expect(math).toHaveLength(0);
  });

  it("does not italicize underscores inside protected math", () => {
    const doc = parseDocument("Value $x_i$ stays math.", { mode: "strict" });
    const math = doc.blocks[0].inlines.find((n) => n.type === "math");
    expect(math.source).toBe("x_i");
    expect(doc.blocks[0].inlines.some((n) => n.type === "emphasis")).toBe(false);
  });

  it("preserves fenced code without parsing math inside it", () => {
    const doc = parseDocument("```\n\\frac{a}{b}\n```", { mode: "strict" });
    expect(doc.blocks[0].type).toBe("code");
    expect(doc.blocks[0].value).toContain("\\frac");
  });

  it("keeps heading, lists, display math, and following prose as separate blocks", () => {
    const input = `## 1.3 Skewness of Data and Its Interpretation

- Some bullet
1. Numbered item

$$ Mean = Median = Mode $$
The data is symmetric.`;
    const doc = parseDocument(input, { mode: "strict" });
    const types = doc.blocks.map((b) => b.type);
    expect(types).toEqual(["heading", "list", "list", "math", "paragraph"]);
    expect(doc.blocks[0]).toMatchObject({ type: "heading", level: 2 });
    expect(doc.blocks[0].inlines[0].value).toContain("Skewness");
    expect(doc.blocks[1]).toMatchObject({ type: "list", ordered: false });
    expect(doc.blocks[1].items[0].inlines[0].value).toBe("Some bullet");
    expect(doc.blocks[2]).toMatchObject({ type: "list", ordered: true });
    expect(doc.blocks[2].items[0].inlines[0].value).toBe("Numbered item");
    expect(doc.blocks[3]).toMatchObject({ type: "math", display: true });
    expect(doc.blocks[3].source).toMatch(/Mean\s*=\s*Median\s*=\s*Mode/);
    expect(doc.blocks[4].type).toBe("paragraph");
    expect(doc.blocks[4].inlines[0].value).toBe("The data is symmetric.");
    expect(doc.blocks).toHaveLength(5);

    const html = renderToFragmentHTML(doc);
    expect(html).toContain("<h2>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
    expect(html).toContain('class="display-math"');
    expect(html).toContain("<p>The data is symmetric.</p>");
    expect(html).not.toMatch(/ModeThe data/);
  });

  it("splits display math from following prose even without a blank line", () => {
    const doc = parseDocument("$$ Mean = Median = Mode $$\nThe data is symmetric.", { mode: "strict" });
    expect(doc.blocks.map((b) => b.type)).toEqual(["math", "paragraph"]);
    expect(doc.blocks[0].display).toBe(true);
    expect(doc.blocks[1].inlines[0].value).toBe("The data is symmetric.");
  });

  it("splits display math glued to surrounding text on the same line", () => {
    const doc = parseDocument("Before $$ Mean = Median = Mode $$The data is symmetric.", { mode: "strict" });
    expect(doc.blocks.map((b) => b.type)).toEqual(["paragraph", "math", "paragraph"]);
    expect(doc.blocks[0].inlines[0].value).toBe("Before");
    expect(doc.blocks[1].display).toBe(true);
    expect(doc.blocks[2].inlines[0].value).toBe("The data is symmetric.");
  });

  it("starts a new block after a heading even without a blank line", () => {
    const doc = parseDocument("## Heading\nThe data is symmetric.", { mode: "strict" });
    expect(doc.blocks.map((b) => b.type)).toEqual(["heading", "paragraph"]);
    expect(doc.blocks[1].inlines[0].value).toBe("The data is symmetric.");
  });

  it("splits \\[ \\] display math from adjacent prose", () => {
    const doc = parseDocument("Intro\n\\[x=1\\]\nThe data is next.", { mode: "strict" });
    expect(doc.blocks.map((b) => b.type)).toEqual(["paragraph", "math", "paragraph"]);
    expect(doc.blocks[1].display).toBe(true);
    expect(doc.blocks[2].inlines[0].value).toBe("The data is next.");
  });

  it("exports display math and following text as separate Word paragraphs", async () => {
    const doc = parseDocument("$$ Mean = Median = Mode $$\nThe data is symmetric.", { mode: "strict" });
    const xml = documentXml(await unzipDocx(await documentToDocxBuffer(doc)));
    expect(xml).toContain("m:oMath");
    expect(xml).toContain("The data is symmetric.");
    const mathIndex = xml.indexOf("m:oMath");
    const textIndex = xml.indexOf("The data is symmetric.");
    expect(mathIndex).toBeGreaterThan(-1);
    expect(textIndex).toBeGreaterThan(mathIndex);
    expect(xml.slice(mathIndex, textIndex)).toMatch(/<\/w:p>/);
  });
});
