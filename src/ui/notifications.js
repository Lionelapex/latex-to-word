export function showNotice(element, message, isError = true) {
  element.hidden = false;
  element.textContent = message;
  element.style.background = isError ? "#fffbeb" : "#ecfdf3";
  element.style.color = isError ? "#92400e" : "#065f46";
}

export function hideNotice(element) {
  element.hidden = true;
  element.textContent = "";
}
