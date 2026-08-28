import { describe, expect, it } from "vitest";
import { insertAtCursor } from "../../src/ui/editor.js";

describe("editor helpers", () => {
  it("insertAtCursor returns the inserted range", () => {
    const textarea = {
      value: "prefixsuffix",
      selectionStart: 6,
      selectionEnd: 6,
      setSelectionRange(start, end) {
        this.selectionStart = start;
        this.selectionEnd = end;
      },
    };

    const range = insertAtCursor(textarea, "NEW");

    expect(textarea.value).toBe("prefixNEWsuffix");
    expect(range).toEqual({ start: 6, end: 9 });
    expect(textarea.selectionStart).toBe(9);
    expect(textarea.selectionEnd).toBe(9);
  });
});
