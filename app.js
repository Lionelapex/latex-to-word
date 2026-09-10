import "./src/styles/main.css";
import { parseDocument } from "./src/parser/index.js";
import { renderPreview } from "./src/renderers/html-renderer.js";
import { documentToDocxBlob } from "./src/exporters/docx-exporter.js";
import { pasteFromClipboard, copyTextToClipboard } from "./src/exporters/clipboard-exporter.js";
import { documentToHtmlFile } from "./src/exporters/html-exporter.js";
import { normalizePastedContent } from "./src/parser/table-normalizer.js";
import { insertAtCursor, scrollToRange } from "./src/ui/editor.js";
import {
  extractTextFromImage,
  formatOcrProgress,
  getImageFileFromDataTransfer,
  isImageFile,
} from "./src/ui/image-ocr.js";
import { createOcrResultPanel } from "./src/ui/ocr-result.js";
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
import { startPresence } from "./src/analytics/presence.js";
import { errorLog } from "./src/ui/error-log.js";
import {
  canSendErrorReport,
  createExceptionEntry,
  createExportIssuesEntry,
  createUserReportEntry,
  shouldLogExportIssues,
} from "./src/utils/error-log.js";
import { sendErrorReport } from "./src/utils/send-error-report.js";
import { getErrorReportEmail } from "./src/config/error-report.js";
import {
  ensureProfile,
  getProfile,
  getSession,
  isAuthConfigured,
  onAuthStateChange,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
} from "./src/auth/supabase-client.js";
import { ANON_EXPORT_LIMIT, createTrialGate } from "./src/ui/trial-gate.js";

const input = document.getElementById("input");
const preview = document.getElementById("preview");
const notice = document.getElementById("notice");
const statsEl = document.getElementById("stats");
const mathIssuesEl = document.getElementById("math-issues");
const modeSelect = document.getElementById("mode-select");
const sampleSelect = document.getElementById("sample-select");
const docxButton = document.getElementById("btn-docx");
const docxPlainButton = document.getElementById("btn-docx-plain");
const redownloadButton = document.getElementById("btn-redownload");
const exportHistorySelect = document.getElementById("export-history");
const imageOcrButton = document.getElementById("btn-image-ocr");
const imageInput = document.getElementById("image-input");
const sendErrorReportButton = document.getElementById("btn-send-error-report");
const errorReportNote = document.getElementById("error-report-note");
const errorReportHelp = document.getElementById("error-report-help");
const trialBanner = document.getElementById("trial-banner");
const trialBannerText = document.getElementById("trial-banner-text");
const trialBannerSignIn = document.getElementById("trial-banner-signin");
const trialGate = createTrialGate();
const ocrPanel = createOcrResultPanel({
  panel: document.getElementById("ocr-panel"),
  titleEl: document.getElementById("ocr-panel-title"),
  progressWrap: document.getElementById("ocr-progress-wrap"),
  progressBar: document.getElementById("ocr-progress-bar"),
  progressLabel: document.getElementById("ocr-progress-label"),
  resultWrap: document.getElementById("ocr-result-wrap"),
  previewEl: document.getElementById("ocr-preview"),
  copyBtn: document.getElementById("btn-ocr-copy"),
  jumpBtn: document.getElementById("btn-ocr-jump"),
  dismissBtn: document.getElementById("btn-ocr-dismiss"),
  errorEl: document.getElementById("ocr-error"),
});

let currentDoc = null;
let activeIssueId = null;
let ocrBusy = false;
let sendingReport = false;

function currentIssues() {
  return currentDoc ? listMathIssues(currentDoc) : [];
}

function recordException(stage, error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (!String(message).trim()) return;
  errorLog.record(createExceptionEntry({ stage, error, mode: modeSelect?.value })).catch(() => {});
}

function updateSendReportButton() {
  if (!sendErrorReportButton) return;
  const email = getErrorReportEmail();
  const allowed = canSendErrorReport({
    stats: currentDoc?.stats ?? null,
    issues: currentIssues(),
    entries: errorLog.list(),
  });
  sendErrorReportButton.disabled = sendingReport || !email || !allowed;
  if (!errorReportHelp) return;
  if (!email) {
    errorReportHelp.textContent = "Error reporting is not configured.";
  } else {
    errorReportHelp.textContent =
      "You can send a report even when Warnings and Failed are 0. Sending includes the pasted document, any failed equations, and your note. Nothing is uploaded until you click Send.";
  }
}

const savedDraft = loadDraft();
if (savedDraft !== null && savedDraft.length > 0) {
  input.value = savedDraft;
} else {
  input.value = SAMPLES[DEFAULT_SAMPLE_KEY].text;
}

function convert() {
  if (!notice.classList.contains("notice-success")) {
    hideNotice();
  }
  activeIssueId = null;
  try {
    currentDoc = parseDocument(input.value, { mode: modeSelect.value });
    renderPreview(preview, currentDoc);
    updateStats(currentDoc.stats);
    renderIssuesPanel();
  } catch (error) {
    recordException("convert", error);
    showNotice(error.message || "Could not convert the document.");
  }
  updateSendReportButton();
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

function setOcrBusy(busy) {
  ocrBusy = busy;
  if (imageOcrButton) {
    imageOcrButton.disabled = busy;
    imageOcrButton.textContent = busy ? "Reading image…" : "Extract from image";
  }
}

async function importImageForOcr(file) {
  if (!file || !isImageFile(file)) {
    ocrPanel.showError("Choose a PNG, JPG, or other image file.");
    return;
  }
  if (ocrBusy) return;

  setOcrBusy(true);
  ocrPanel.showProgress(0, formatOcrProgress(0));

  try {
    const text = await extractTextFromImage(file, {
      onProgress: (progress) => {
        ocrPanel.showProgress(progress, formatOcrProgress(progress));
      },
    });

    if (!text) {
      ocrPanel.showError("No text was found in that image.");
      return;
    }

    const range = insertAtCursor(input, text);
    ocrPanel.showResult(text, range);
    scrollToRange(input, range.start, range.end);
    scheduleDraftSave(input.value);
    flushAutoConvert();
  } catch (error) {
    ocrPanel.showError(error.message || "Could not read text from the image.");
  } finally {
    setOcrBusy(false);
  }
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

function recordExportIssuesIfNeeded() {
  if (!currentDoc || !shouldLogExportIssues(currentDoc.stats, currentIssues())) return;
  errorLog
    .record(
      createExportIssuesEntry({
        mode: modeSelect?.value,
        stats: currentDoc.stats,
        issues: currentIssues(),
        stage: "export",
      }),
    )
    .catch(() => {});
}

function formatTrialRemaining(remaining) {
  if (!Number.isFinite(remaining)) return "";
  if (remaining <= 0) return "No free downloads left — sign in to keep exporting.";
  const noun = remaining === 1 ? "download" : "downloads";
  return `${remaining} free ${noun} left`;
}

function updateTrialUi() {
  const signedIn = trialGate.isSignedIn();
  const remaining = trialGate.getRemaining();
  if (trialBanner) {
    if (signedIn) {
      trialBanner.hidden = true;
    } else {
      trialBanner.hidden = false;
      trialBanner.dataset.state = remaining <= 0 ? "exhausted" : "ok";
      if (trialBannerText) {
        trialBannerText.textContent =
          remaining <= 0
            ? `You've used your ${ANON_EXPORT_LIMIT} free downloads. Sign in for unlimited exports (free plan). Preview still works.`
            : `${formatTrialRemaining(remaining)} without signing in. Preview is always free.`;
      }
    }
  }
  if (trialBannerSignIn) {
    trialBannerSignIn.classList.toggle("hidden", signedIn);
  }
}

function requireExportEntitlement({ promptSignIn = true } = {}) {
  if (trialGate.canExport()) return true;
  updateTrialUi();
  showNotice(
    `Free trial used (${ANON_EXPORT_LIMIT} downloads). Sign in to download .docx or HTML — conversion stays in your browser.`,
    true,
  );
  if (promptSignIn) openAuthDialog("signin");
  return false;
}

function afterSuccessfulExport() {
  const result = trialGate.consumeExport();
  updateTrialUi();
  return result;
}

async function downloadDocx() {
  if (!requireExportEntitlement()) return;
  if (!currentDoc) flushAutoConvert();
  const blob = await documentToDocxBlob(currentDoc);
  const name = exportName("docx");
  downloadBlob(blob, name);
  afterSuccessfulExport();
  await rememberExport("docx", blob, name);
  const rem = formatTrialRemaining(trialGate.getRemaining());
  showNotice(rem ? `Downloaded ${name}. ${rem}.` : `Downloaded ${name}`, false);
  recordExportIssuesIfNeeded();
}

async function downloadDocxPlain() {
  if (!requireExportEntitlement()) return;
  if (!currentDoc) flushAutoConvert();
  const blob = await documentToDocxBlob(currentDoc, { mathMode: "plain" });
  const name = exportFilename(currentDoc, "docx", {
    rawInput: input.value,
    stemSuffix: "plain-text",
  });
  downloadBlob(blob, name);
  afterSuccessfulExport();
  await rememberExport("docx-plain", blob, name);
  const rem = formatTrialRemaining(trialGate.getRemaining());
  showNotice(rem ? `Downloaded ${name}. ${rem}.` : `Downloaded ${name}`, false);
  recordExportIssuesIfNeeded();
}

async function downloadHtml() {
  if (!requireExportEntitlement()) return;
  if (!currentDoc) flushAutoConvert();
  const html = documentToHtmlFile(currentDoc);
  const name = exportName("html");
  const blob = new Blob([html], { type: "text/html" });
  downloadBlob(blob, name);
  afterSuccessfulExport();
  await rememberExport("html", blob, name);
  const rem = formatTrialRemaining(trialGate.getRemaining());
  showNotice(rem ? `Downloaded ${name}. ${rem}.` : `Downloaded ${name}`, false);
  recordExportIssuesIfNeeded();
}

function redownloadSelected(id = null) {
  if (!requireExportEntitlement()) return;
  const entry = id ? exportCache.getById(id) : exportCache.getLast();
  if (!entry) return;
  downloadBlob(entry.blob, entry.filename);
  afterSuccessfulExport();
  const rem = formatTrialRemaining(trialGate.getRemaining());
  showNotice(
    rem ? `Downloaded ${entry.filename} again. ${rem}.` : `Downloaded ${entry.filename} again`,
    false,
  );
}
document.getElementById("btn-clear").addEventListener("click", () => {
  autoConvert.cancel();
  input.value = "";
  clearDraft();
  ocrPanel.hide();
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

imageOcrButton?.addEventListener("click", () => {
  imageInput?.click();
});

imageInput?.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  imageInput.value = "";
  if (file) importImageForOcr(file);
});

document.getElementById("btn-ocr-copy")?.addEventListener("click", async () => {
  const text = ocrPanel.getLastText();
  if (!text) return;
  try {
    await copyTextToClipboard(text);
    showNotice("Copied extracted text to clipboard.", false);
  } catch (error) {
    showNotice(error.message || "Could not copy extracted text.");
  }
});

document.getElementById("btn-ocr-jump")?.addEventListener("click", () => {
  const range = ocrPanel.resolveRange(input);
  if (!range) {
    showNotice("Could not find the extracted text in the editor. It may have been edited.");
    return;
  }
  scrollToRange(input, range.start, range.end);
});

input.addEventListener("input", () => {
  scheduleDraftSave(input.value);
  scheduleAutoConvert();
});

input.addEventListener("paste", (event) => {
  const imageFile = getImageFileFromDataTransfer(event.clipboardData);
  if (imageFile) {
    event.preventDefault();
    importImageForOcr(imageFile);
    return;
  }

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
    recordException("docx", error);
    showNotice(error.message || "Could not build the Word document.");
  });
});

docxPlainButton?.addEventListener("click", () => {
  downloadDocxPlain().catch((error) => {
    recordException("docx-plain", error);
    showNotice(error.message || "Could not build the plain-text Word document.");
  });
});

document.getElementById("btn-html")?.addEventListener("click", () => {
  downloadHtml().catch((error) => {
    recordException("html", error);
    showNotice(error.message || "Could not build the HTML export.");
  });
});

sendErrorReportButton?.addEventListener("click", async () => {
  if (sendingReport) return;
  const confirmed = window.confirm(
    "This sends your pasted document to the developer so they can reproduce the problem. Continue?",
  );
  if (!confirmed) return;

  sendingReport = true;
  sendErrorReportButton.disabled = true;
  sendErrorReportButton.textContent = "Sending…";

  const note = errorReportNote?.value ?? "";
  try {
    await errorLog.ready;
    await sendErrorReport(errorLog.list(), {
      email: getErrorReportEmail(),
      document: input.value,
      issues: currentIssues(),
      note,
    });
    await errorLog.record(createUserReportEntry({ mode: modeSelect?.value, note }));
    showNotice("Error report sent. Thank you.", false);
    if (errorReportNote) errorReportNote.value = "";
  } catch (error) {
    showNotice(error.message || "Could not send the error report.");
    sendingReport = false;
    sendErrorReportButton.disabled = false;
  } finally {
    sendingReport = false;
    sendErrorReportButton.textContent = "Send error report";
    updateSendReportButton();
  }
});

window.addEventListener("error", (event) => {
  if (sendingReport) return;
  recordException("runtime", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  if (sendingReport) return;
  recordException("runtime", event.reason);
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
    return;
  }
  if (mod && event.shiftKey && event.key.toLowerCase() === "t") {
    event.preventDefault();
    docxPlainButton?.click();
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

const authDialog = document.getElementById("auth-dialog");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authMessage = document.getElementById("auth-message");
const authUserEl = document.getElementById("auth-user");
const authPlanEl = document.getElementById("auth-plan");
const authOpenBtn = document.getElementById("btn-auth-open");
const authSignOutBtn = document.getElementById("btn-auth-signout");
const authCloseBtn = document.getElementById("btn-auth-close");
const authSubmitBtn = document.getElementById("btn-auth-submit");
const authGoogleBtn = document.getElementById("btn-auth-google");
const authTabSignIn = document.getElementById("auth-tab-signin");
const authTabRegister = document.getElementById("auth-tab-register");
const authConfigHint = document.getElementById("auth-config-hint");
const authDialogTitle = document.getElementById("auth-dialog-title");

let authMode = "signin";

function setAuthMessage(text, kind = "info") {
  if (!authMessage) return;
  if (!text) {
    authMessage.hidden = true;
    authMessage.textContent = "";
    return;
  }
  authMessage.hidden = false;
  authMessage.textContent = text;
  authMessage.className =
    kind === "error"
      ? "text-sm leading-relaxed text-red-700"
      : kind === "success"
        ? "text-sm leading-relaxed text-emerald-700"
        : "text-sm leading-relaxed text-slate-600";
}

function setAuthMode(mode) {
  authMode = mode === "register" ? "register" : "signin";
  const isRegister = authMode === "register";
  if (authDialogTitle) authDialogTitle.textContent = isRegister ? "Register" : "Sign in";
  if (authSubmitBtn) authSubmitBtn.textContent = isRegister ? "Create account" : "Sign in";
  if (authPassword) {
    authPassword.autocomplete = isRegister ? "new-password" : "current-password";
  }
  if (authTabSignIn) {
    authTabSignIn.setAttribute("aria-selected", String(!isRegister));
    authTabSignIn.classList.toggle("btn-primary", !isRegister);
  }
  if (authTabRegister) {
    authTabRegister.setAttribute("aria-selected", String(isRegister));
    authTabRegister.classList.toggle("btn-primary", isRegister);
  }
  setAuthMessage("");
}

function renderAuthSession(session, profile = null) {
  const email = session?.user?.email || profile?.email || "";
  const signedIn = Boolean(session?.user?.id);
  const label = profile?.display_name || email;
  trialGate.setSignedIn(signedIn);
  updateTrialUi();
  if (authUserEl) {
    authUserEl.textContent = label;
    authUserEl.classList.toggle("hidden", !signedIn);
    authUserEl.title = email || label;
  }
  if (authPlanEl) {
    const plan = profile?.plan || (signedIn ? "free" : "");
    authPlanEl.textContent = plan ? `Plan: ${plan}` : "";
    authPlanEl.classList.toggle("hidden", !signedIn);
  }
  if (authOpenBtn) authOpenBtn.classList.toggle("hidden", signedIn);
  if (authSignOutBtn) authSignOutBtn.classList.toggle("hidden", !signedIn);
}

async function syncProfileFromSession(session) {
  const user = session?.user;
  if (!user?.id) {
    renderAuthSession(null, null);
    return;
  }
  renderAuthSession(session, null);
  const ensured = await ensureProfile(user);
  if (ensured.error) {
    const existing = await getProfile(user.id);
    renderAuthSession(session, existing.data ?? null);
    return;
  }
  renderAuthSession(session, ensured.data ?? null);
}

function openAuthDialog(mode = "signin") {
  setAuthMode(mode);
  const configured = isAuthConfigured();
  if (authConfigHint) {
    if (configured) {
      authConfigHint.hidden = true;
      authConfigHint.textContent = "";
    } else {
      authConfigHint.hidden = false;
      authConfigHint.textContent =
        "Supabase Auth is not configured. For local use, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env. For latextodocx.com, add the same names as GitHub Actions secrets and redeploy Pages. The converter still works without signing in.";
    }
  }
  if (authSubmitBtn) authSubmitBtn.disabled = !configured;
  if (authGoogleBtn) authGoogleBtn.disabled = !configured;
  if (authEmail) authEmail.disabled = !configured;
  if (authPassword) authPassword.disabled = !configured;
  setAuthMessage("");
  authDialog?.showModal?.();
  if (configured) authEmail?.focus?.();
}

async function refreshAuthSession() {
  const { data, error } = await getSession();
  if (error) {
    renderAuthSession(null, null);
    return;
  }
  await syncProfileFromSession(data?.session ?? null);
}

authOpenBtn?.addEventListener("click", () => openAuthDialog("signin"));
trialBannerSignIn?.addEventListener("click", () => openAuthDialog("signin"));
authCloseBtn?.addEventListener("click", () => authDialog?.close?.());
authTabSignIn?.addEventListener("click", () => setAuthMode("signin"));
authTabRegister?.addEventListener("click", () => setAuthMode("register"));

authGoogleBtn?.addEventListener("click", async () => {
  if (!isAuthConfigured()) {
    setAuthMessage("Auth is not configured. See docs/saas/AUTH.md.", "error");
    return;
  }
  authGoogleBtn.disabled = true;
  setAuthMessage("Redirecting to Google…");
  const { data, error } = await signInWithGoogle();
  if (error) {
    authGoogleBtn.disabled = false;
    setAuthMessage(error.message || "Google sign-in failed.", "error");
    return;
  }
  if (data?.url) {
    window.location.assign(data.url);
    return;
  }
  authGoogleBtn.disabled = false;
  setAuthMessage("Google sign-in did not return a redirect URL.", "error");
});

authSignOutBtn?.addEventListener("click", async () => {
  authSignOutBtn.disabled = true;
  const { error } = await signOut();
  authSignOutBtn.disabled = false;
  if (error) {
    showNotice(error.message || "Sign out failed.");
    return;
  }
  renderAuthSession(null, null);
});

authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAuthConfigured()) {
    setAuthMessage("Auth is not configured. See docs/saas/AUTH.md.", "error");
    return;
  }
  const email = String(authEmail?.value || "").trim();
  const password = String(authPassword?.value || "");
  if (!email || !password) {
    setAuthMessage("Enter email and password.", "error");
    return;
  }
  if (authSubmitBtn) authSubmitBtn.disabled = true;
  setAuthMessage(authMode === "register" ? "Creating account…" : "Signing in…");
  const result =
    authMode === "register" ? await signUp(email, password) : await signIn(email, password);
  if (authSubmitBtn) authSubmitBtn.disabled = false;
  if (result.error) {
    setAuthMessage(result.error.message || "Authentication failed.", "error");
    return;
  }
  if (authMode === "register" && !result.data?.session) {
    setAuthMessage(
      "Check your email to confirm your account, then sign in.",
      "success",
    );
    setAuthMode("signin");
    return;
  }
  await syncProfileFromSession(result.data?.session ?? null);
  authDialog?.close?.();
  if (authPassword) authPassword.value = "";
  showNotice("Signed in. Downloads are unlocked on the free plan.", false);
});

authDialog?.addEventListener("close", () => {
  setAuthMessage("");
  if (authPassword) authPassword.value = "";
});

onAuthStateChange((_event, session) => {
  syncProfileFromSession(session).catch(() => renderAuthSession(session, null));
});
refreshAuthSession().catch(() => renderAuthSession(null, null));

convert();
updateExportControls();
updateTrialUi();
errorLog.ready.then(() => updateSendReportButton()).catch(() => {});
startPresence();
