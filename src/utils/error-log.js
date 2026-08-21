export const MAX_ERROR_LOG = 50;
export const MAX_SNIPPET_LENGTH = 400;
export const MAX_ISSUE_SNIPPETS = 25;
export const MAX_ISSUE_SOURCE_LENGTH = 20000;
export const MAX_DOCUMENT_LENGTH = 100000;
export const MAX_STACK_LENGTH = 2000;
export const APP_VERSION = "0.1.0";

export function truncateSnippet(text, max = MAX_SNIPPET_LENGTH) {
  const trimmed = String(text ?? "");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`;
}

export function summarizeUserAgent(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  return truncateSnippet(userAgent, 180);
}

export function sanitizeIssue(issue, { sourceMax = MAX_SNIPPET_LENGTH } = {}) {
  return {
    kind: issue?.kind === "warning" ? "warning" : "failed",
    source: truncateSnippet(issue?.source, sourceMax),
    message: truncateSnippet(issue?.message, 200),
    display: Boolean(issue?.display),
  };
}

export function formatFailedLatex(issues = []) {
  const list = Array.isArray(issues) ? issues : [];
  if (!list.length) return "(No failed or warning math in the current document.)";
  return list
    .map((issue, index) => {
      const kind = issue?.kind === "warning" ? "warning" : "failed";
      const display = issue?.display ? "display" : "inline";
      const source = truncateSnippet(issue?.source, MAX_ISSUE_SOURCE_LENGTH) || "(empty)";
      const message = String(issue?.message || "").trim();
      return `${index + 1}. [${kind} · ${display}]\n${source}${message ? `\n${message}` : ""}`;
    })
    .join("\n\n");
}

export function fingerprint(entry) {
  if (entry?.kind === "exception") {
    return `exception|${entry.stage || "runtime"}|${entry.message || ""}`;
  }
  if (entry?.kind === "user-report") {
    return `user-report|${entry.id || entry.createdAt}`;
  }
  const issueKey = (entry?.issues || [])
    .map((issue) => `${issue.kind}:${issue.source}:${issue.message}`)
    .join("|");
  return `export-issues|${entry?.mode || ""}|${issueKey}`;
}

function newId(createdAt) {
  return `err-${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createExceptionEntry({
  stage = "runtime",
  error,
  mode = null,
  createdAt = Date.now(),
  userAgent,
  appVersion = APP_VERSION,
} = {}) {
  const err = error instanceof Error ? error : new Error(String(error ?? "Unknown error"));
  const entry = {
    id: newId(createdAt),
    createdAt,
    kind: "exception",
    stage: stage || "runtime",
    message: truncateSnippet(err.message || "Unknown error", 300),
    stack: truncateSnippet(err.stack || "", MAX_STACK_LENGTH) || null,
    mode: mode || null,
    stats: null,
    issues: null,
    userAgent: summarizeUserAgent(userAgent),
    appVersion,
    count: 1,
  };
  entry.fingerprint = fingerprint(entry);
  return entry;
}

export function shouldLogExportIssues(stats, issues = []) {
  if (stats && (Number(stats.failed) > 0 || Number(stats.warnings) > 0)) return true;
  return issues.length > 0;
}

export function createExportIssuesEntry({
  mode = null,
  stats = null,
  issues = [],
  stage = "export",
  createdAt = Date.now(),
  userAgent,
  appVersion = APP_VERSION,
} = {}) {
  const total = issues.length;
  const sanitized = issues.slice(0, MAX_ISSUE_SNIPPETS).map((issue) => sanitizeIssue(issue));
  const failed = stats?.failed ?? sanitized.filter((issue) => issue.kind === "failed").length;
  const warnings = stats?.warnings ?? sanitized.filter((issue) => issue.kind === "warning").length;
  const extra = total > sanitized.length ? ` Showing ${sanitized.length} of ${total}.` : "";
  const entry = {
    id: newId(createdAt),
    createdAt,
    kind: "export-issues",
    stage: stage || "export",
    message: `Export had ${failed} failed and ${warnings} warning math expressions.${extra}`,
    stack: null,
    mode: mode || null,
    stats: stats
      ? {
          converted: Number(stats.converted) || 0,
          warnings: Number(stats.warnings) || 0,
          failed: Number(stats.failed) || 0,
        }
      : null,
    issues: sanitized,
    userAgent: summarizeUserAgent(userAgent),
    appVersion,
    count: 1,
  };
  entry.fingerprint = fingerprint(entry);
  return entry;
}

export function createUserReportEntry({
  mode = null,
  createdAt = Date.now(),
  userAgent,
  appVersion = APP_VERSION,
} = {}) {
  const entry = {
    id: newId(createdAt),
    createdAt,
    kind: "user-report",
    stage: "report",
    message: "User clicked Send error report",
    stack: null,
    mode: mode || null,
    stats: null,
    issues: null,
    userAgent: summarizeUserAgent(userAgent),
    appVersion,
    count: 1,
  };
  entry.fingerprint = fingerprint(entry);
  return entry;
}

export function addErrorEntry(log, entry, max = MAX_ERROR_LOG) {
  const fp = entry?.fingerprint || fingerprint(entry);
  const existing = (log || []).find((item) => (item.fingerprint || fingerprint(item)) === fp);
  if (existing) {
    const updated = {
      ...existing,
      createdAt: entry.createdAt || Date.now(),
      count: (existing.count || 1) + 1,
      stack: entry.stack || existing.stack,
    };
    return [updated, ...(log || []).filter((item) => item.id !== existing.id)].slice(0, max);
  }
  return [{ ...entry, fingerprint: fp, count: entry.count || 1 }, ...(log || [])].slice(0, max);
}

export function formatErrorReport(entries, { document = "", issues = [] } = {}) {
  return JSON.stringify(
    {
      product: "LaTeX to Word",
      generatedAt: new Date().toISOString(),
      note: "User clicked Send error report. Includes the pasted document and failed/warning LaTeX.",
      appVersion: APP_VERSION,
      document: truncateSnippet(document, MAX_DOCUMENT_LENGTH),
      failedMath: (issues || []).map((issue) => sanitizeIssue(issue, { sourceMax: MAX_ISSUE_SOURCE_LENGTH })),
      entries: (entries || []).map((entry) => ({
        createdAt: entry.createdAt,
        kind: entry.kind,
        stage: entry.stage,
        message: entry.message,
        stack: entry.stack,
        mode: entry.mode,
        stats: entry.stats,
        issues: entry.issues,
        count: entry.count || 1,
        userAgent: entry.userAgent,
        appVersion: entry.appVersion,
      })),
    },
    null,
    2,
  );
}
