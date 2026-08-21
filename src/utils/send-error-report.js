import { formatErrorReport, formatFailedLatex, truncateSnippet, MAX_DOCUMENT_LENGTH } from "./error-log.js";

export function formsubmitReportUrl(email) {
  return `https://formsubmit.co/ajax/${encodeURIComponent(String(email || "").trim())}`;
}

export function summarizeReport(entries = [], issues = []) {
  const crashes = entries.filter((entry) => entry.kind === "exception").length;
  const math = entries.filter((entry) => entry.kind === "export-issues").length;
  const clicks = entries.filter((entry) => entry.kind === "user-report").length;
  const liveFailed = (issues || []).filter((issue) => issue.kind !== "warning").length;
  const liveWarnings = (issues || []).filter((issue) => issue.kind === "warning").length;
  return `${crashes} crash(es), ${math} stored math snapshot(s), ${clicks} send-click(s), ${liveFailed} live failed, ${liveWarnings} live warning(s)`;
}

export async function sendErrorReport(entries, { email, document = "", issues = [], fetchImpl } = {}) {
  const destination = String(email || "").trim();
  if (!destination) {
    throw new Error("Error reporting is not configured");
  }
  const fetchFn = fetchImpl || globalThis.fetch;
  if (typeof fetchFn !== "function") {
    throw new Error("Could not send the error report");
  }
  const response = await fetchFn(formsubmitReportUrl(destination), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      _subject: "LaTeX to Word error report",
      name: "LaTeX to Word",
      summary: summarizeReport(entries, issues),
      failed_latex: formatFailedLatex(issues),
      document: truncateSnippet(document, MAX_DOCUMENT_LENGTH) || "(empty document)",
      details: formatErrorReport(entries, { document, issues }),
    }),
  });
  if (!response.ok) {
    throw new Error("Could not send the error report");
  }
  const data = await response.json().catch(() => ({}));
  if (data.success === false || data.success === "false") {
    throw new Error("Could not send the error report");
  }
  return data;
}
