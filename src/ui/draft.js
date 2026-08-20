const STORAGE_KEY = "latex-to-word:draft";
const SAVE_DELAY_MS = 400;

let timer = null;

export function loadDraft() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === null ? null : value;
  } catch {
    return null;
  }
}

export function saveDraft(text) {
  try {
    localStorage.setItem(STORAGE_KEY, text);
  } catch {
    /* quota or private mode */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Debounced save on textarea input. */
export function scheduleDraftSave(text) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    saveDraft(text);
  }, SAVE_DELAY_MS);
}
