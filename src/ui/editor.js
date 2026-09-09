export function getInput(textarea) {
  return textarea.value;
}

export function setInput(textarea, value) {
  textarea.value = value;
}

export function clearInput(textarea) {
  textarea.value = "";
}

export function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const value = textarea.value;
  textarea.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
  const pos = start + String(text).length;
  textarea.setSelectionRange(pos, pos);
  return { start, end: pos };
}

export function scrollToRange(textarea, start, end) {
  textarea.focus();
  textarea.setSelectionRange(start, end);
  const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20;
  const before = textarea.value.slice(0, start);
  const line = before.split("\n").length - 1;
  textarea.scrollTop = Math.max(0, line * lineHeight - textarea.clientHeight / 3);
}
