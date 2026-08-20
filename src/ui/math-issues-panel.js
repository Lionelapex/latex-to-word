function truncate(text, max = 72) {
  const trimmed = (text || "").replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function renderMathIssuesPanel(container, issues, { activeId = null, onSelect } = {}) {
  container.replaceChildren();
  if (!issues.length) {
    container.hidden = true;
    return;
  }

  container.hidden = false;

  const heading = document.createElement("h3");
  heading.className = "issues-heading";
  heading.textContent = "Math issues";
  container.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "issues-list";

  for (const issue of issues) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `issue-item issue-${issue.kind}${activeId === issue.id ? " active" : ""}`;
    button.dataset.issueId = issue.id;

    const label = document.createElement("span");
    label.className = "issue-label";
    label.textContent = issue.kind === "failed" ? "Failed" : "Warning";

    const source = document.createElement("code");
    source.className = "issue-source";
    source.textContent = truncate(issue.source);

    const message = document.createElement("span");
    message.className = "issue-message";
    message.textContent = issue.message;

    button.append(label, source, message);
    button.addEventListener("click", () => onSelect?.(issue));
    item.appendChild(button);
    list.appendChild(item);
  }

  container.appendChild(list);
}

export function highlightIssueInPreview(preview, issueId) {
  preview.querySelectorAll("[data-issue-id]").forEach((el) => {
    el.classList.toggle("issue-active", el.dataset.issueId === issueId);
  });
  const target = preview.querySelector(`[data-issue-id="${issueId}"]`);
  target?.scrollIntoView({ behavior: "smooth", block: "center" });
  return Boolean(target);
}

export function clearIssueHighlights(preview) {
  preview.querySelectorAll("[data-issue-id]").forEach((el) => {
    el.classList.remove("issue-active");
  });
}
