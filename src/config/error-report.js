export const DEFAULT_ERROR_REPORT_EMAIL = "lionelapex@gmail.com";

export function getErrorReportEmail() {
  return String(import.meta.env.VITE_ERROR_REPORT_EMAIL || DEFAULT_ERROR_REPORT_EMAIL || "").trim();
}
