import { describe, expect, it } from "vitest";
import { createOcrResultPanel } from "../../src/ui/ocr-result.js";

function makePanelDom() {
  const panel = { hidden: true };
  const titleEl = { textContent: "" };
  const progressWrap = { hidden: true };
  const progressBar = { style: { width: "0%" } };
  const progressLabel = { textContent: "" };
  const resultWrap = { hidden: true };
  const previewEl = { textContent: "" };
  const copyBtn = { disabled: true };
  const jumpBtn = {};
  const dismissBtn = { addEventListener: () => {} };
  const errorEl = { hidden: true, textContent: "" };

  return createOcrResultPanel({
    panel,
    titleEl,
    progressWrap,
    progressBar,
    progressLabel,
    resultWrap,
    previewEl,
    copyBtn,
    jumpBtn,
    dismissBtn,
    errorEl,
  });
}

describe("OCR result panel", () => {
  it("shows progress while reading an image", () => {
    const ocrPanel = makePanelDom();
    ocrPanel.showProgress(0.42, "Reading image… 42%");

    expect(ocrPanel.getLastText()).toBeNull();
  });

  it("stores extracted text and resolves its range in the editor", () => {
    const ocrPanel = makePanelDom();
    const text = "Hello OCR Test";
    ocrPanel.showResult(text, { start: 6, end: 6 + text.length });

    const textarea = { value: `prefix${text}suffix` };

    expect(ocrPanel.getLastText()).toBe(text);
    expect(ocrPanel.resolveRange(textarea)).toEqual({ start: 6, end: 6 + text.length });
  });

  it("finds extracted text after the editor changes elsewhere", () => {
    const ocrPanel = makePanelDom();
    const text = "Moved text";
    ocrPanel.showResult(text, { start: 0, end: text.length });

    const textarea = { value: `intro\n${text}\noutro` };

    expect(ocrPanel.resolveRange(textarea)).toEqual({ start: 6, end: 6 + text.length });
  });
});
