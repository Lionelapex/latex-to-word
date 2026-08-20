import { normalizePastedContent } from "../parser/table-normalizer.js";

export async function pasteFromClipboard() {
  const { html, text } = await readClipboardHtmlAndText();
  if (!html && !text) {
    throw new Error("Clipboard read is not available. Use Ctrl+V in the input box.");
  }
  return normalizePastedContent({ html, text });
}

async function readClipboardHtmlAndText() {
  let html = "";
  let text = "";

  if (navigator.clipboard?.read) {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (!html && item.types.includes("text/html")) {
          html = await (await item.getType("text/html")).text();
        }
        if (!text && item.types.includes("text/plain")) {
          text = await (await item.getType("text/plain")).text();
        }
      }
    } catch {
      // Permission or browser limits; fall back to readText().
    }
  }

  if (!text && navigator.clipboard?.readText) {
    try {
      text = await navigator.clipboard.readText();
    } catch {
      // Caller surfaces a paste fallback.
    }
  }

  return { html, text };
}
