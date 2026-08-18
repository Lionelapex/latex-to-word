import { describe, expect, it } from "vitest";
import { parseDocument } from "../../src/parser/index.js";
import { toMathMLString } from "../../src/renderers/mathml-renderer.js";
import { documentToDocxBuffer } from "../../src/exporters/docx-exporter.js";
import { unzipDocx, documentXml } from "../helpers/unzip.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

function load(name) {
  return readFileSync(join(dir, name), "utf8");
}

describe("realistic fixtures", () => {
  it("converts sample mean, SD, probability, and a stats table", async () => {
    const input = load("statistics.md");
    const doc = parseDocument(input, { mode: "smart" });
    const mathBlocks = doc.blocks.filter((b) => b.type === "math");
    expect(mathBlocks.length).toBeGreaterThanOrEqual(3);
    expect(mathBlocks.every((m) => m.ast.type !== "failed")).toBe(true);

    const table = doc.blocks.find((b) => b.type === "table");
    expect(table).toBeTruthy();
    const cellMath = table.rows.flatMap((row) => row.flatMap((cell) => cell.inlines.filter((n) => n.type === "math")));
    expect(cellMath.length).toBeGreaterThan(0);

    const mean = mathBlocks.find((m) => m.source.includes("\\bar{x}"));
    expect(toMathMLString(mean.ast)).toContain("mfrac");

    const xml = documentXml(await unzipDocx(await documentToDocxBuffer(doc)));
    expect(xml).toContain("m:oMath");
    expect(xml).toContain("w:tbl");
    expect(xml).toContain("m:f");
    expect(xml).toContain("m:nary");
    expect(xml).toContain("m:rad");
  });

  it("converts the normal density formula", () => {
    const input = load("normal.md");
    const doc = parseDocument(input, { mode: "strict" });
    const math = doc.blocks.find((b) => b.type === "math");
    expect(math.ast.type).not.toBe("failed");
    expect(toMathMLString(math.ast)).toContain("mfrac");
  });
});
