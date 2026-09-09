/** Extract plain text from inline document nodes (no formatting). */
export function inlinesToPlainText(inlines) {
  if (!inlines?.length) return "";
  return inlines
    .map((node) => {
      if (node.type === "text" || node.type === "code") return node.value || "";
      if (node.children) return inlinesToPlainText(node.children);
      if (node.type === "math") return node.source || "";
      return "";
    })
    .join("");
}

/** First heading or paragraph title from a parsed document. */
export function titleFromDocument(document) {
  if (!document?.blocks?.length) return "";
  for (const block of document.blocks) {
    if (block.type === "heading") {
      const text = inlinesToPlainText(block.inlines).trim();
      if (text) return text;
    }
  }
  for (const block of document.blocks) {
    if (block.type === "paragraph") {
      const text = inlinesToPlainText(block.inlines).trim();
      if (text) return text;
    }
  }
  return "";
}

/** First meaningful line from raw paste (before convert). */
export function titleFromRawInput(raw) {
  if (!raw) return "";
  for (const line of raw.split(/\r?\n/)) {
    let text = line.trim();
    if (!text) continue;
    text = text.replace(/^#{1,6}\s+/, "");
    text = text.replace(/^[-*+]\s+/, "");
    text = text.replace(/^\d+\.\s+/, "");
    if (text.startsWith("|") || text.startsWith("```")) continue;
    return text.trim();
  }
  return "";
}

const INVALID_CHARS = /[\\/:*?"<>|]/g;
const WHITESPACE = /\s+/g;
const MAX_LENGTH = 80;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Make a Windows-safe filename stem (no extension).
 * @param {string} title
 * @param {string} [fallback='latex-to-word']
 */
export function sanitizeFilenameStem(title, fallback = "latex-to-word") {
  let stem = (title || "")
    .replace(INVALID_CHARS, "")
    .replace(WHITESPACE, " ")
    .trim()
    .replace(/\.+$/g, "");

  if (!stem) stem = fallback;
  if (stem.length > MAX_LENGTH) stem = stem.slice(0, MAX_LENGTH).trim();
  if (WINDOWS_RESERVED.test(stem)) stem = `${stem}-document`;
  return stem || fallback;
}

/**
 * @param {import('../model/document-model.js').createDocument extends Function ? ReturnType<typeof import('../model/document-model.js').createDocument> : object} document
 * @param {string} extension e.g. 'docx' or 'html'
 * @param {{ rawInput?: string, fallback?: string, stemSuffix?: string }} [options]
 */
export function exportFilename(document, extension, options = {}) {
  const { rawInput = "", fallback = "latex-to-word", stemSuffix = "" } = options;
  const title =
    titleFromDocument(document) ||
    titleFromRawInput(rawInput) ||
    fallback;
  const stem = sanitizeFilenameStem(title, fallback);
  const suffix = String(stemSuffix || "")
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  const fullStem = suffix ? `${stem}-${suffix}` : stem;
  const ext = extension.replace(/^\./, "");
  return `${fullStem}.${ext}`;
}
