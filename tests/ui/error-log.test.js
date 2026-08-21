import { describe, expect, it } from "vitest";
import {
  MAX_ERROR_LOG,
  MAX_SNIPPET_LENGTH,
  addErrorEntry,
  createExceptionEntry,
  createExportIssuesEntry,
  fingerprint,
  formatErrorReport,
  formatFailedLatex,
  sanitizeIssue,
  shouldLogExportIssues,
  truncateSnippet,
} from "../../src/utils/error-log.js";
import { ErrorLog } from "../../src/ui/error-log.js";
import { formsubmitReportUrl, sendErrorReport, summarizeReport } from "../../src/utils/send-error-report.js";
import { DEFAULT_ERROR_REPORT_EMAIL, getErrorReportEmail } from "../../src/config/error-report.js";

describe("error log helpers", () => {
  it("truncates only oversized snippets for local storage", () => {
    const long = "x".repeat(MAX_SNIPPET_LENGTH + 80);
    const clipped = truncateSnippet(long);
    expect(clipped.length).toBe(MAX_SNIPPET_LENGTH);
    expect(clipped.endsWith("…")).toBe(true);
    expect(sanitizeIssue({ kind: "failed", source: long, message: "bad" }).source).toBe(clipped);
  });

  it("creates exception entries without storing input", () => {
    const error = new Error("boom");
    const entry = createExceptionEntry({
      stage: "docx",
      error,
      mode: "smart",
      createdAt: 1,
      userAgent: "Mozilla/5.0 Test",
    });
    expect(entry.kind).toBe("exception");
    expect(entry.message).toBe("boom");
    expect(entry.stack).toContain("boom");
    expect(entry).not.toHaveProperty("input");
    expect(JSON.stringify(entry)).not.toContain("\\frac{1}{2}");
  });

  it("creates export-issue snapshots from failed math snippets", () => {
    const entry = createExportIssuesEntry({
      mode: "strict",
      stats: { converted: 3, warnings: 1, failed: 2 },
      issues: [
        { kind: "failed", source: "\\unknown{x}", message: "Unknown command \\unknown", display: true },
        { kind: "warning", source: "a_b^", message: "Partial parse failure", display: false },
      ],
      createdAt: 2,
    });
    expect(entry.kind).toBe("export-issues");
    expect(entry.issues).toHaveLength(2);
    expect(entry.issues[0].source).toBe("\\unknown{x}");
    expect(entry.message).toContain("2 failed");
    expect(shouldLogExportIssues(entry.stats, entry.issues)).toBe(true);
    expect(shouldLogExportIssues({ converted: 4, warnings: 0, failed: 0 }, [])).toBe(false);
  });

  it("dedupes matching entries and bumps the count", () => {
    const first = createExceptionEntry({
      stage: "parse",
      error: new Error("same"),
      createdAt: 10,
    });
    const second = createExceptionEntry({
      stage: "parse",
      error: new Error("same"),
      createdAt: 20,
    });
    expect(fingerprint(first)).toBe(fingerprint(second));
    const log = addErrorEntry(addErrorEntry([], first), second);
    expect(log).toHaveLength(1);
    expect(log[0].count).toBe(2);
    expect(log[0].createdAt).toBe(20);
  });

  it("caps the log and formats a shareable report", () => {
    let log = [];
    for (let i = 0; i < MAX_ERROR_LOG + 3; i += 1) {
      log = addErrorEntry(
        log,
        createExceptionEntry({
          stage: "runtime",
          error: new Error(`n${i}`),
          createdAt: i,
        }),
      );
    }
    expect(log).toHaveLength(MAX_ERROR_LOG);
    const report = formatErrorReport(log.slice(0, 1), {
      document: "\\frac{a}{b} and some notes",
      issues: [{ kind: "failed", source: "\\unknown{x}", message: "Unknown command \\unknown" }],
    });
    expect(report).toContain("LaTeX to Word");
    expect(report).toContain("\\frac{a}{b} and some notes");
    expect(report).toContain("\\unknown{x}");
    expect(formatFailedLatex([{ kind: "failed", source: "\\bar{x}", message: "bad", display: true }])).toContain(
      "\\bar{x}",
    );
  });
});

describe("send error report", () => {
  it("posts the pasted document and failed LaTeX to FormSubmit", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({ success: true }),
      };
    };
    const entries = [
      createExceptionEntry({
        stage: "docx",
        error: new Error("Could not build the Word document."),
        createdAt: 1,
      }),
    ];
    const issues = [{ kind: "failed", source: "\\unknown{x}", message: "Unknown command \\unknown", display: true }];
    const document = "Here is the full paste with $\\unknown{x}$ inside.";
    await sendErrorReport(entries, {
      email: "owner@example.com",
      document,
      issues,
      fetchImpl,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(formsubmitReportUrl("owner@example.com"));
    const body = JSON.parse(calls[0].options.body);
    expect(body.summary).toBe(summarizeReport(entries, issues));
    expect(body.failed_latex).toContain("\\unknown{x}");
    expect(body.document).toBe(document);
    expect(body.details).toContain("Could not build the Word document.");
    expect(JSON.parse(body.details).document).toBe(document);
  });

  it("refuses to send when no inbox is configured", async () => {
    await expect(sendErrorReport([], { email: "  ", fetchImpl: async () => {} })).rejects.toThrow(
      "Error reporting is not configured",
    );
  });

  it("defaults the operator inbox to lionelapex@gmail.com", () => {
    expect(DEFAULT_ERROR_REPORT_EMAIL).toBe("lionelapex@gmail.com");
    expect(getErrorReportEmail()).toBe("lionelapex@gmail.com");
  });
});

describe("ErrorLog", () => {
  it("stores entries in memory", async () => {
    const log = new ErrorLog(3);
    await log.record(
      createExceptionEntry({
        stage: "html",
        error: new Error("export failed"),
        createdAt: 5,
      }),
    );
    expect(log.count()).toBe(1);
    expect(log.list()[0].stage).toBe("html");
    await log.clear();
    expect(log.count()).toBe(0);
  });
});
