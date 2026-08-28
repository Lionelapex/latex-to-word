export function createOcrResultPanel({
  panel,
  titleEl,
  progressWrap,
  progressBar,
  progressLabel,
  resultWrap,
  previewEl,
  copyBtn,
  jumpBtn,
  dismissBtn,
  errorEl,
}) {
  let lastText = null;
  let lastRange = null;

  function openPanel() {
    panel.hidden = false;
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  function hide() {
    panel.hidden = true;
    progressWrap.hidden = true;
    resultWrap.hidden = true;
    errorEl.hidden = true;
    previewEl.textContent = "";
    lastText = null;
    lastRange = null;
    if (copyBtn) copyBtn.disabled = true;
  }

  function showProgress(progress, label) {
    openPanel();
    titleEl.textContent = "Reading image";
    progressWrap.hidden = false;
    resultWrap.hidden = true;
    errorEl.hidden = true;
    const percent = Math.max(0, Math.min(100, Math.round((progress || 0) * 100)));
    progressBar.style.width = `${percent}%`;
    progressLabel.textContent = label || `Reading image… ${percent}%`;
    if (copyBtn) copyBtn.disabled = true;
  }

  function showResult(text, range) {
    lastText = text;
    lastRange = range;
    openPanel();
    titleEl.textContent = "Extracted from image";
    progressWrap.hidden = true;
    resultWrap.hidden = false;
    errorEl.hidden = true;
    previewEl.textContent = text;
    if (copyBtn) copyBtn.disabled = !text;
  }

  function showError(message) {
    openPanel();
    titleEl.textContent = "Image text extraction";
    progressWrap.hidden = true;
    resultWrap.hidden = true;
    errorEl.hidden = false;
    errorEl.textContent = message;
    if (copyBtn) copyBtn.disabled = true;
  }

  function resolveRange(textarea) {
    if (!lastText) return null;
    if (
      lastRange &&
      textarea.value.slice(lastRange.start, lastRange.end) === lastText
    ) {
      return lastRange;
    }
    const index = textarea.value.indexOf(lastText);
    if (index < 0) return null;
    return { start: index, end: index + lastText.length };
  }

  function getLastText() {
    return lastText;
  }

  dismissBtn?.addEventListener("click", hide);

  return {
    hide,
    showProgress,
    showResult,
    showError,
    resolveRange,
    getLastText,
  };
}
