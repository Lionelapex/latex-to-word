import { toMathMLString, appendMathML } from "./mathml-renderer.js";
import { escapeHtml } from "../utils/xml.js";

export function renderPreview(container, documentModel) {
  const doc = container.ownerDocument;
  container.replaceChildren();
  const page = doc.createElement("div");
  page.className = "word-page";
  for (const block of documentModel.blocks || []) {
    page.appendChild(renderBlock(doc, block));
  }
  if (!(documentModel.blocks || []).length) {
    const empty = doc.createElement("p");
    empty.className = "preview-empty";
    empty.textContent = "Paste content and click Convert to preview.";
    page.appendChild(empty);
  }
  container.appendChild(page);
}

function renderBlock(doc, block) {
  if (block.type === "heading") {
    const node = doc.createElement(`h${Math.min(6, Math.max(1, block.level || 1))}`);
    appendInlines(node, block.inlines || [], doc);
    return node;
  }
  if (block.type === "paragraph") {
    const node = doc.createElement("p");
    appendInlines(node, block.inlines || [], doc);
    return node;
  }
  if (block.type === "math") {
    const wrap = doc.createElement("div");
    wrap.className = "display-math";
    if (block.ast?.type === "failed") wrap.classList.add("math-failed-block");
    appendMathML(wrap, block.ast, { display: true, document: doc });
    wrap.dataset.source = block.source || "";
    return wrap;
  }
  if (block.type === "list") {
    const node = doc.createElement(block.ordered ? "ol" : "ul");
    for (const item of block.items || []) {
      const li = doc.createElement("li");
      appendInlines(li, item.inlines || [], doc);
      for (const child of item.blocks || []) {
        li.appendChild(renderBlock(doc, child));
      }
      node.appendChild(li);
    }
    return node;
  }
  if (block.type === "table") {
    const table = doc.createElement("table");
    table.setAttribute("border", "1");
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";
    const thead = doc.createElement("thead");
    thead.appendChild(renderTableRow(doc, block.header || [], block.aligns, true));
    table.appendChild(thead);
    const tbody = doc.createElement("tbody");
    for (const row of block.rows || []) {
      tbody.appendChild(renderTableRow(doc, row, block.aligns, false));
    }
    table.appendChild(tbody);
    return table;
  }
  if (block.type === "quote") {
    const quote = doc.createElement("blockquote");
    for (const child of block.blocks || []) quote.appendChild(renderBlock(doc, child));
    return quote;
  }
  if (block.type === "code") {
    const pre = doc.createElement("pre");
    const code = doc.createElement("code");
    code.textContent = block.value || "";
    pre.appendChild(code);
    return pre;
  }
  if (block.type === "rule") return doc.createElement("hr");
  const unknown = doc.createElement("p");
  unknown.textContent = "";
  return unknown;
}

function renderTableRow(doc, cells, aligns, header) {
  const tr = doc.createElement("tr");
  for (let i = 0; i < cells.length; i += 1) {
    const cell = doc.createElement(header ? "th" : "td");
    cell.style.border = "1px solid #bfbfbf";
    cell.style.padding = "0.4em 0.65em";
    cell.style.verticalAlign = "top";
    if (header) cell.style.background = "#f2f2f2";
    if (aligns?.[i]) cell.style.textAlign = aligns[i];
    appendInlines(cell, cells[i].inlines || [], doc);
    tr.appendChild(cell);
  }
  return tr;
}

function appendInlines(parent, inlines, doc, marks = {}) {
  for (const node of inlines) {
    if (node.type === "text") {
      const span = doc.createElement(marks.bold && marks.italic ? "strong" : marks.bold ? "strong" : marks.italic ? "em" : "span");
      if (marks.bold && marks.italic) {
        const em = doc.createElement("em");
        em.textContent = node.value;
        span.appendChild(em);
      } else {
        span.textContent = node.value;
      }
      parent.appendChild(span);
      continue;
    }
    if (node.type === "strong") {
      appendInlines(parent, node.children || [], doc, { ...marks, bold: true });
      continue;
    }
    if (node.type === "emphasis") {
      appendInlines(parent, node.children || [], doc, { ...marks, italic: true });
      continue;
    }
    if (node.type === "code") {
      const code = doc.createElement("code");
      code.textContent = node.value;
      parent.appendChild(code);
      continue;
    }
    if (node.type === "math") {
      if (node.display) {
        const wrap = doc.createElement("div");
        wrap.className = node.ast?.type === "failed" ? "display-math math-failed-block" : "display-math";
        wrap.dataset.source = node.source || "";
        appendMathML(wrap, node.ast, { display: true, document: doc });
        parent.appendChild(wrap);
        continue;
      }
      const span = doc.createElement("span");
      span.className = node.ast?.type === "failed" ? "inline-math math-failed-inline" : "inline-math";
      span.dataset.source = node.source || "";
      appendMathML(span, node.ast, { display: false, document: doc });
      parent.appendChild(span);
    }
  }
}

export function renderToHTML(documentModel) {
  const parts = (documentModel.blocks || []).map(blockToHtml);
  return `<!DOCTYPE html><html><body>${parts.join("")}</body></html>`;
}

export function renderToFragmentHTML(documentModel) {
  return (documentModel.blocks || []).map(blockToHtml).join("");
}

function blockToHtml(block) {
  if (block.type === "heading") {
    const level = Math.min(6, Math.max(1, block.level || 1));
    return `<h${level}>${inlinesToHtml(block.inlines || [])}</h${level}>`;
  }
  if (block.type === "paragraph") return `<p>${inlinesToHtml(block.inlines || [])}</p>`;
  if (block.type === "math") {
    return `<div class="display-math">${toMathMLString(block.ast, { display: true })}</div>`;
  }
  if (block.type === "list") {
    const tag = block.ordered ? "ol" : "ul";
    const items = (block.items || [])
      .map((item) => {
        const nested = (item.blocks || []).map(blockToHtml).join("");
        return `<li>${inlinesToHtml(item.inlines || [])}${nested}</li>`;
      })
      .join("");
    return `<${tag}>${items}</${tag}>`;
  }
  if (block.type === "table") {
    const head = `<tr>${(block.header || []).map((cell, i) => `<th${alignAttr(block.aligns, i)}>${inlinesToHtml(cell.inlines || [])}</th>`).join("")}</tr>`;
    const body = (block.rows || [])
      .map(
        (row) =>
          `<tr>${row.map((cell, i) => `<td${alignAttr(block.aligns, i)}>${inlinesToHtml(cell.inlines || [])}</td>`).join("")}</tr>`,
      )
      .join("");
    return `<table border="1" style="border-collapse:collapse;width:100%"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }
  if (block.type === "quote") return `<blockquote>${(block.blocks || []).map(blockToHtml).join("")}</blockquote>`;
  if (block.type === "code") return `<pre><code>${escapeHtml(block.value || "")}</code></pre>`;
  if (block.type === "rule") return "<hr/>";
  return "";
}

function alignAttr(aligns, i) {
  const align = aligns?.[i];
  const extra = align ? `text-align:${escapeHtml(align)};` : "";
  return ` style="border:1px solid #bfbfbf;padding:0.4em 0.65em;vertical-align:top;${extra}"`;
}

function inlinesToHtml(inlines, marks = {}) {
  return inlines
    .map((node) => {
      if (node.type === "text") {
        let html = escapeHtml(node.value);
        if (marks.italic) html = `<em>${html}</em>`;
        if (marks.bold) html = `<strong>${html}</strong>`;
        return html;
      }
      if (node.type === "strong") return inlinesToHtml(node.children || [], { ...marks, bold: true });
      if (node.type === "emphasis") return inlinesToHtml(node.children || [], { ...marks, italic: true });
      if (node.type === "code") return `<code>${escapeHtml(node.value)}</code>`;
      if (node.type === "math") {
        if (node.display) return `<div class="display-math">${toMathMLString(node.ast, { display: true })}</div>`;
        return toMathMLString(node.ast, { display: false });
      }
      return "";
    })
    .join("");
}
