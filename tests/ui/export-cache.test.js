import { describe, expect, it } from "vitest";
import {
  MAX_EXPORT_HISTORY,
  addExportEntry,
  createExportEntry,
  getLastExport,
} from "../../src/utils/export-history.js";
import { ExportCache } from "../../src/ui/export-cache.js";

describe("export history helpers", () => {
  it("prepends new entries and trims to max", () => {
    const first = createExportEntry("docx", new Blob(["a"]), "a.docx", "a");
    const second = createExportEntry("docx", new Blob(["b"]), "b.docx", "b");
    const third = createExportEntry("html", new Blob(["c"]), "c.html", "c");
    let history = addExportEntry([], first);
    history = addExportEntry(history, second);
    history = addExportEntry(history, third);
    expect(history.map((entry) => entry.id)).toEqual(["c", "b", "a"]);
    expect(addExportEntry(history, createExportEntry("docx", new Blob(["d"]), "d.docx", "d"), 2).map((entry) => entry.id)).toEqual([
      "d",
      "c",
    ]);
    expect(MAX_EXPORT_HISTORY).toBe(5);
  });

  it("returns the latest export by type", () => {
    const history = [
      createExportEntry("html", new Blob(["h"]), "notes.html", "html-1"),
      createExportEntry("docx", new Blob(["d"]), "notes.docx", "docx-1"),
      createExportEntry("docx", new Blob(["d2"]), "other.docx", "docx-2"),
    ];
    expect(getLastExport(history)?.id).toBe("html-1");
    expect(getLastExport(history, "docx")?.filename).toBe("notes.docx");
  });
});

describe("ExportCache", () => {
  it("stores and retrieves recent exports in memory", async () => {
    const cache = new ExportCache(3);
    await cache.add("docx", new Blob(["docx"]), "report.docx");
    await cache.add("html", new Blob(["html"]), "report.html");
    expect(cache.list()).toHaveLength(2);
    expect(cache.getLast("docx")?.filename).toBe("report.docx");
    expect(cache.getById(cache.list()[0].id)?.type).toBe("html");
  });
});
