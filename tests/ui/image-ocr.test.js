import { describe, expect, it } from "vitest";
import {
  formatOcrProgress,
  getImageFileFromDataTransfer,
  isImageFile,
} from "../../src/ui/image-ocr.js";

describe("image OCR helpers", () => {
  it("detects image files by mime type", () => {
    expect(isImageFile({ type: "image/png" })).toBe(true);
    expect(isImageFile({ type: "text/plain" })).toBe(false);
    expect(isImageFile(null)).toBe(false);
  });

  it("reads an image file from clipboard items", () => {
    const png = { type: "image/png", name: "shot.png" };
    const dataTransfer = {
      items: [
        { kind: "file", type: "image/png", getAsFile: () => png },
        { kind: "string", type: "text/plain", getAsFile: () => null },
      ],
    };
    expect(getImageFileFromDataTransfer(dataTransfer)).toBe(png);
  });

  it("returns null when clipboard has no image", () => {
    expect(getImageFileFromDataTransfer({ items: [] })).toBeNull();
    expect(getImageFileFromDataTransfer(null)).toBeNull();
  });

  it("formats OCR progress as a percentage", () => {
    expect(formatOcrProgress(0.456)).toBe("Reading image… 46%");
    expect(formatOcrProgress(1)).toBe("Reading image… 100%");
  });
});
