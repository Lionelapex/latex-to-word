import { describe, expect, it } from "vitest";
import {
  exportFilename,
  sanitizeFilenameStem,
  titleFromDocument,
  titleFromRawInput,
} from "../../src/utils/filename.js";
import { createDocument } from "../../src/model/document-model.js";

describe("filename utilities", () => {
  it("uses first heading for export name", () => {
    const doc = createDocument([
      {
        type: "heading",
        level: 2,
        inlines: [{ type: "text", value: "1.4 Coffee Creamer Case Study" }],
      },
      {
        type: "paragraph",
        inlines: [{ type: "text", value: "Body text." }],
      },
    ]);
    expect(titleFromDocument(doc)).toBe("1.4 Coffee Creamer Case Study");
    expect(exportFilename(doc, "docx")).toBe("1.4 Coffee Creamer Case Study.docx");
  });

  it("falls back to first paragraph when no heading", () => {
    const doc = createDocument([
      {
        type: "paragraph",
        inlines: [{ type: "text", value: "Question one intro" }],
      },
    ]);
    expect(exportFilename(doc, "html")).toBe("Question one intro.html");
  });

  it("reads title from raw markdown before parse", () => {
    const raw = "## Question One\n\nSome math $x$";
    expect(titleFromRawInput(raw)).toBe("Question One");
    expect(exportFilename(createDocument([]), "docx", { rawInput: raw })).toBe(
      "Question One.docx",
    );
  });

  it("can add a stem suffix for the plain-text Word export", () => {
    const doc = createDocument([
      { type: "heading", level: 1, inlines: [{ type: "text", value: "Title" }] },
    ]);
    expect(exportFilename(doc, "docx", { stemSuffix: "plain-text" })).toBe("Title-plain-text.docx");
  });

  it("sanitizes invalid Windows characters", () => {
    expect(sanitizeFilenameStem('File: bad/name?')).toBe("File badname");
    expect(sanitizeFilenameStem("")).toBe("latex-to-word");
  });

  it("avoids reserved Windows device names", () => {
    expect(sanitizeFilenameStem("CON")).toBe("CON-document");
  });
});
