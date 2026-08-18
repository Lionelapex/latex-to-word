import { parseDocument } from "./src/parser/index.js";
import { renderPreview } from "./src/renderers/html-renderer.js";
import { documentToDocxBlob } from "./src/exporters/docx-exporter.js";
import { copyForWord, pasteFromClipboard } from "./src/exporters/clipboard-exporter.js";
import { documentToHtmlFile } from "./src/exporters/html-exporter.js";
import { normalizePastedContent } from "./src/parser/table-normalizer.js";
import { insertAtCursor } from "./src/ui/editor.js";

const SAMPLE = `## 1.2 Difference Between Empirical and Theoretical Probability

Empirical probability is calculated from actual observations.

\\[
P(E) =
\\frac{\\text{Number of times an event occurs}}
{\\text{Total number of trials or observations}}
\\]

The theoretical probability is:

\\[
P(E) =
\\frac{\\text{Number of favorable outcomes}}
{\\text{Total number of possible outcomes}}
\\]

For the sample:

\\[
\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n}x_i
\\]

The standard deviation is:

\\[
s =
\\sqrt{
\\frac{
\\sum_{i=1}^{n}(x_i-\\bar{x})^2
}{
n-1
}
}

\\]

| Variable        | Symbol    | Value      |
| --------------- | --------- | ---------- |
| Population mean | $\\mu$     | $1.000$ kg |
| Sample mean     | $\\bar{x}$ | $1.135$ kg |
| Sample size     | $n$       | $100$      |
`;

const input = document.getElementById("input");
const preview = document.getElementById("preview");
const notice = document.getElementById("notice");
const statsEl = document.getElementById("stats");
const modeSelect = document.getElementById("mode-select");

let currentDoc = null;

input.value = SAMPLE;

function convert() {
  hideNotice();
  currentDoc = parseDocument(input.value, { mode: modeSelect.value });
  renderPreview(preview, currentDoc);
  updateStats(currentDoc.stats);
}

function updateStats(stats) {
  statsEl.hidden = false;
  document.getElementById("stat-converted").textContent = `Converted: ${stats.converted}`;
  document.getElementById("stat-warnings").textContent = `Warnings: ${stats.warnings}`;
  document.getElementById("stat-failed").textContent = `Failed: ${stats.failed}`;
}

function showNotice(message, isError = true) {
  notice.hidden = false;
  notice.textContent = message;
  notice.style.background = isError ? "#fffbeb" : "#ecfdf3";
  notice.style.color = isError ? "#92400e" : "#065f46";
}

function hideNotice() {
  notice.hidden = true;
  notice.textContent = "";
}

function highlightFailed(kind) {
  preview.querySelectorAll(".math-failed-inline, .math-failed-block").forEach((el) => {
    el.classList.toggle("stat-active", kind !== "converted");
  });
  if (kind === "failed" || kind === "warnings") {
    const first = preview.querySelector(".math-failed-inline, .math-failed-block");
    first?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

document.getElementById("btn-convert").addEventListener("click", convert);
document.getElementById("btn-clear").addEventListener("click", () => {
  input.value = "";
  currentDoc = null;
  preview.replaceChildren();
  statsEl.hidden = true;
  hideNotice();
});

document.getElementById("btn-paste").addEventListener("click", async () => {
  try {
    input.value = await pasteFromClipboard();
    convert();
  } catch (error) {
    showNotice(error.message || "Could not read the clipboard. Paste into the box with Ctrl+V.");
  }
});

input.addEventListener("paste", (event) => {
  const html = event.clipboardData?.getData("text/html") || "";
  const text = event.clipboardData?.getData("text/plain") || "";
  const normalized = normalizePastedContent({ html, text });
  if (normalized === text) return;
  event.preventDefault();
  insertAtCursor(input, normalized);
});

document.getElementById("btn-copy").addEventListener("click", async () => {
  if (!currentDoc) convert();
  try {
    await copyForWord(currentDoc);
    showNotice("Copied HTML and plain text. Download .docx remains the most reliable path into Word.", false);
  } catch (error) {
    showNotice(`${error.message || "Clipboard permission failed."} Download .docx is still available.`);
  }
});

document.getElementById("btn-docx").addEventListener("click", async () => {
  if (!currentDoc) convert();
  try {
    const blob = await documentToDocxBlob(currentDoc);
    downloadBlob(blob, "latex-to-word.docx");
  } catch (error) {
    showNotice(error.message || "Could not build the Word document.");
  }
});

document.getElementById("btn-html").addEventListener("click", () => {
  if (!currentDoc) convert();
  const html = documentToHtmlFile(currentDoc);
  downloadBlob(new Blob([html], { type: "text/html" }), "latex-to-word.html");
});

document.getElementById("stat-failed").addEventListener("click", () => highlightFailed("failed"));
document.getElementById("stat-warnings").addEventListener("click", () => highlightFailed("warnings"));

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    convert();
  }
});

function downloadBlob(blob, filename) {
  const type =
    blob.type ||
    (filename.endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/octet-stream");
  const file = blob.type ? blob : new Blob([blob], { type });
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

convert();
