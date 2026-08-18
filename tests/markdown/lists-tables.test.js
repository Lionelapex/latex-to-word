import { describe, expect, it } from "vitest";
import { parseDocument } from "../../src/parser/index.js";
import { renderToFragmentHTML } from "../../src/renderers/html-renderer.js";
import { documentToPlainText } from "../../src/exporters/clipboard-exporter.js";

describe("lists and GFM tables", () => {
  it("parses unicode bullets from ChatGPT paste", () => {
    const doc = parseDocument("• first\n• second", { mode: "strict" });
    expect(doc.blocks[0].type).toBe("list");
    expect(doc.blocks[0].ordered).toBe(false);
    expect(doc.blocks[0].items).toHaveLength(2);
    expect(doc.blocks[0].items[0].inlines[0].value).toBe("first");
  });

  it("parses unordered, ordered, and nested lists", () => {
    const doc = parseDocument("- a\n- b\n  - b.1\n\n1. one\n2. two", { mode: "strict" });
    const lists = doc.blocks.filter((b) => b.type === "list");
    expect(lists[0].ordered).toBe(false);
    expect(lists[0].items).toHaveLength(2);
    expect(lists[0].items[1].blocks[0].type).toBe("list");
    expect(lists[1].ordered).toBe(true);
    expect(lists[1].items).toHaveLength(2);
  });

  it("parses GFM tables with inline math in cells", () => {
    const input = `| Variable | Symbol |\n| --- | --- |\n| mean | $\\mu$ |`;
    const doc = parseDocument(input, { mode: "strict" });
    const table = doc.blocks.find((b) => b.type === "table");
    expect(table.header).toHaveLength(2);
    expect(table.rows[0][1].inlines.some((n) => n.type === "math")).toBe(true);
  });

  it("renders lists and tables to clipboard HTML", () => {
    const doc = parseDocument("- item\n\n| A | B |\n| --- | --- |\n| 1 | 2 |", { mode: "strict" });
    const html = renderToFragmentHTML(doc);
    expect(html).toContain("<ul>");
    expect(html).toContain("<table");
    expect(documentToPlainText(doc)).toContain("- item");
  });
});
