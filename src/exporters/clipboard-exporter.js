import { renderToFragmentHTML } from "../renderers/html-renderer.js";
import { normalizePastedContent } from "../parser/table-normalizer.js";

export function documentToPlainText(documentModel) {
  return (documentModel.blocks || []).map(blockToPlain).join("\n\n");
}

function blockToPlain(block) {
  if (block.type === "heading") return `${"#".repeat(block.level || 1)} ${inlinesToPlain(block.inlines || [])}`;
  if (block.type === "paragraph") return inlinesToPlain(block.inlines || []);
  if (block.type === "math") return `\\[${block.source || ""}\\]`;
  if (block.type === "list") {
    return (block.items || [])
      .map((item, i) => {
        const bullet = block.ordered ? `${i + 1}. ` : "- ";
        const nested = (item.blocks || []).map(blockToPlain).join("\n");
        return `${bullet}${inlinesToPlain(item.inlines || [])}${nested ? `\n${nested}` : ""}`;
      })
      .join("\n");
  }
  if (block.type === "table") {
    const header = (block.header || []).map((c) => inlinesToPlain(c.inlines || [])).join(" | ");
    const sep = (block.header || []).map(() => "---").join(" | ");
    const rows = (block.rows || []).map((row) => row.map((c) => inlinesToPlain(c.inlines || [])).join(" | ")).join("\n");
    return `| ${header} |\n| ${sep} |\n${rows ? `| ${rows.split("\n").join(" |\n| ")} |` : ""}`.trim();
  }
  if (block.type === "quote") return (block.blocks || []).map((b) => `> ${blockToPlain(b)}`).join("\n");
  if (block.type === "code") return `\`\`\`\n${block.value || ""}\n\`\`\``;
  if (block.type === "rule") return "---";
  return "";
}

function inlinesToPlain(inlines) {
  return (inlines || [])
    .map((node) => {
      if (node.type === "text") return node.value;
      if (node.type === "strong") return `**${inlinesToPlain(node.children || [])}**`;
      if (node.type === "emphasis") return `*${inlinesToPlain(node.children || [])}*`;
      if (node.type === "code") return `\`${node.value}\``;
      if (node.type === "math") return `$${node.source || ""}$`;
      return "";
    })
    .join("");
}

export async function copyForWord(documentModel) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${renderToFragmentHTML(documentModel)}</body></html>`;
  const plain = documentToPlainText(documentModel);
  if (!navigator.clipboard?.write) {
    throw new Error("Clipboard write is not available in this browser.");
  }
  const htmlBlob = new Blob([html], { type: "text/html" });
  const textBlob = new Blob([plain], { type: "text/plain" });
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": htmlBlob,
      "text/plain": textBlob,
    }),
  ]);
}

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
