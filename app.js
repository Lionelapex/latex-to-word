import "./src/styles/main.css";
import { parseDocument } from "./src/parser/index.js";
import { renderPreview } from "./src/renderers/html-renderer.js";
import { documentToDocxBlob } from "./src/exporters/docx-exporter.js";
import { pasteFromClipboard } from "./src/exporters/clipboard-exporter.js";
import { documentToHtmlFile } from "./src/exporters/html-exporter.js";
import { normalizePastedContent } from "./src/parser/table-normalizer.js";
import { insertAtCursor } from "./src/ui/editor.js";
import { clearDraft, loadDraft, scheduleDraftSave } from "./src/ui/draft.js";
import { createAutoConvert } from "./src/ui/auto-convert.js";
import {
  clearIssueHighlights,
  highlightIssueInPreview,
  renderMathIssuesPanel,
} from "./src/ui/math-issues-panel.js";
import { exportCache } from "./src/ui/export-cache.js";
import { listMathIssues } from "./src/model/document-model.js";
import { exportFilename } from "./src/utils/filename.js";
import { DEFAULT_SAMPLE_KEY, SAMPLES } from "./src/samples/index.js";

const input = document.getElementById("input");
const preview = document.getElementById("preview");
const notice = document.getElementById("notice");
const statsEl = document.getElementById("stats");
const mathIssuesEl = document.getElementById("math-issues");
const modeSelect = document.getElementById("mode-select");
const sampleSelect = document.getElementById("sample-select");
const docxButton = document.getElementById("btn-docx");
const redownloadButton = document.getElementById("btn-redownload");
const exportHistorySelect = document.getElementById("export-history");

let currentDoc = null;
let activeIssueId = null;

const savedDraft = loadDraft();
if (savedDraft !== null && savedDraft.length > 0) {
  input.value = savedDraft;
} else {
  input.value = SAMPLES[DEFAULT_SAMPLE_KEY].text;
}

function convert() {
  hideNotice();
  activeIssueId = null;
  currentDoc = parseDocument(input.value, { mode: modeSelect.value });
  renderPreview(preview, currentDoc);
  updateStats(currentDoc.stats);
  renderIssuesPanel();
}

const autoConvert = createAutoConvert(convert);

function scheduleAutoConvert() {
  autoConvert.schedule();
}

function flushAutoConvert() {
  autoConvert.flush();
}

function renderIssuesPanel() {
  if (!mathIssuesEl || !currentDoc) return;
  const issues = listMathIssues(currentDoc);
  renderMathIssuesPanel(mathIssuesEl, issues, {
    activeId: activeIssueId,
    onSelect: (issue) => {
      activeIssueId = issue.id;
      renderIssuesPanel();
      highlightIssueInPreview(preview, issue.id);
      jumpToSourceForIssue(issue);
    },
  });
}

function jumpToSourceForIssue(issue) {
  const source = issue.source?.trim();
  if (!source) return;
  const index = input.value.indexOf(source);
  if (index < 0) return;
  input.focus();
  input.setSelectionRange(index, index + source.length);
  const lineHeight = parseFloat(getComputedStyle(input).lineHeight) || 20;
  const before = input.value.slice(0, index);
  const line = before.split("\n").length - 1;
  input.scrollTop = Math.max(0, line * lineHeight - input.clientHeight / 3);
}

function updateStats(stats) {
  statsEl.hidden = false;
  const convertedBtn = document.getElementById("stat-converted");
  const warningsBtn = document.getElementById("stat-warnings");
  const failedBtn = document.getElementById("stat-failed");
  convertedBtn.textContent = `Converted: ${stats.converted}`;
  warningsBtn.textContent = `Warnings: ${stats.warnings}`;
  failedBtn.textContent = `Failed: ${stats.failed}`;
  convertedBtn.classList.toggle("active", false);
  warningsBtn.classList.toggle("active", false);
  failedBtn.classList.toggle("active", false);
}

function showNotice(message, isError = true) {
  notice.hidden = false;
  notice.replaceChildren();
  notice.appendChild(document.createTextNode(message));
  notice.className = `px-4 py-3 text-sm ${isError ? "notice-error border-t" : "notice-success border-t"}`;
}

function hideNotice() {
  notice.hidden = true;
  notice.replaceChildren();
}

function highlightFailed(kind) {
  activeIssueId = null;
  renderIssuesPanel();
  clearIssueHighlights(preview);
  const selector =
    kind === "failed"
      ? ".math-failed-inline, .math-failed-block"
      : kind === "warnings"
        ? ".math-warning-inline, .math-warning-block"
        : null;
  if (!selector) return;
  preview.querySelectorAll(selector).forEach((el) => {
    el.classList.add("issue-active");
  });
  document.getElementById("stat-converted").classList.toggle("active", false);
  document.getElementById("stat-warnings").classList.toggle("active", kind === "warnings");
  document.getElementById("stat-failed").classList.toggle("active", kind === "failed");
  const first = preview.querySelector(`${selector}.issue-active, ${selector}`);
  first?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function exportName(extension) {
  if (!currentDoc) flushAutoConvert();
  return exportFilename(currentDoc, extension, { rawInput: input.value });
}

async function updateExportControls() {
  await exportCache.ready;
  const entries = exportCache.list();
  const hasExports = entries.length > 0;
  if (redownloadButton) redownloadButton.disabled = !hasExports;
  if (!exportHistorySelect) return;

  exportHistorySelect.disabled = !hasExports;
  exportHistorySelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = hasExports ? "Recent exports…" : "No exports yet";
  exportHistorySelect.appendChild(placeholder);
  for (const entry of entries) {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = `${entry.filename} (${entry.type.toUpperCase()})`;
    exportHistorySelect.appendChild(option);
  }
}

async function rememberExport(type, blob, filename) {
  await exportCache.add(type, blob, filename);
  await updateExportControls();
}

async function downloadDocx() {
  if (!currentDoc) flushAutoConvert();
  const blob = await documentToDocxBlob(currentDoc);
  const name = exportName("docx");
  downloadBlob(blob, name);
  await rememberExport("docx", blob, name);
  showNotice(`Downloaded ${name}`, false);
}

async function downloadHtml() {
  if (!currentDoc) flushAutoConvert();
  const html = documentToHtmlFile(currentDoc);
  const name = exportName("html");
  const blob = new Blob([html], { type: "text/html" });
  downloadBlob(blob, name);
  await rememberExport("html", blob, name);
  showNotice(`Downloaded ${name}`, false);
}

function redownloadSelected(id = null) {
  const entry = id ? exportCache.getById(id) : exportCache.getLast();
  if (!entry) return;
  downloadBlob(entry.blob, entry.filename);
  showNotice(`Downloaded ${entry.filename} again`, false);
}

document.getElementById("btn-clear").addEventListener("click", () => {
  autoConvert.cancel();
  input.value = "";
  clearDraft();
  if (sampleSelect) sampleSelect.value = "";
  flushAutoConvert();
});

document.getElementById("btn-paste").addEventListener("click", async () => {
  try {
    input.value = await pasteFromClipboard();
    scheduleDraftSave(input.value);
    flushAutoConvert();
  } catch (error) {
    showNotice(error.message || "Could not read the clipboard. Paste into the box with Ctrl+V.");
  }
});

input.addEventListener("input", () => {
  scheduleDraftSave(input.value);
  scheduleAutoConvert();
});

input.addEventListener("paste", (event) => {
  const html = event.clipboardData?.getData("text/html") || "";
  const text = event.clipboardData?.getData("text/plain") || "";
  const normalized = normalizePastedContent({ html, text });
  if (normalized !== text) {
    event.preventDefault();
    insertAtCursor(input, normalized);
    scheduleDraftSave(input.value);
    flushAutoConvert();
    return;
  }
  queueMicrotask(() => {
    scheduleDraftSave(input.value);
    flushAutoConvert();
  });
});

modeSelect?.addEventListener("change", () => {
  flushAutoConvert();
});

if (sampleSelect) {
  sampleSelect.addEventListener("change", () => {
    const key = sampleSelect.value;
    if (!key || !SAMPLES[key]) return;
    input.value = SAMPLES[key].text;
    scheduleDraftSave(input.value);
    flushAutoConvert();
  });
}

docxButton?.addEventListener("click", () => {
  downloadDocx().catch((error) => {
    showNotice(error.message || "Could not build the Word document.");
  });
});

document.getElementById("btn-html")?.addEventListener("click", () => {
  downloadHtml().catch((error) => {
    showNotice(error.message || "Could not build the HTML export.");
  });
});

redownloadButton?.addEventListener("click", () => redownloadSelected());

exportHistorySelect?.addEventListener("change", () => {
  const id = exportHistorySelect.value;
  if (!id) return;
  redownloadSelected(id);
  exportHistorySelect.value = "";
});

document.getElementById("stat-failed").addEventListener("click", () => highlightFailed("failed"));
document.getElementById("stat-warnings").addEventListener("click", () => highlightFailed("warnings"));

document.addEventListener("keydown", (event) => {
  const mod = event.ctrlKey || event.metaKey;
  if (mod && event.key === "Enter") {
    event.preventDefault();
    flushAutoConvert();
    return;
  }
  if (mod && event.shiftKey && event.key.toLowerCase() === "d") {
    event.preventDefault();
    docxButton?.click();
    return;
  }
  if (mod && event.shiftKey && event.key.toLowerCase() === "h") {
    event.preventDefault();
    document.getElementById("btn-html")?.click();
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
updateExportControls();
