import { mathToPlainText } from "../renderers/plain-text-renderer.js";

export function documentToPlainText(documentModel) {
  const blocks = documentModel?.blocks || [];
  return blocks.map((block) => blockToPlainText(block)).filter((part) => part !== null).join("\n\n").trim() + (blocks.length ? "\n" : "");
}

function blockToPlainText(block, listPrefix = "") {
  if (!block) return "";
  if (block.type === "heading") {
    const level = Math.min(6, Math.max(1, block.level || 1));
    return `${"#".repeat(level)} ${inlinesToPlainText(block.inlines)}`.trim();
  }
  if (block.type === "paragraph") {
    return inlinesToPlainText(block.inlines);
  }
  if (block.type === "math") {
    return mathToPlainText(block.ast) || block.source || "";
  }
  if (block.type === "list") {
    return (block.items || [])
      .map((item, index) => {
        const bullet = block.ordered ? `${index + 1}. ` : "- ";
        const line = `${listPrefix}${bullet}${inlinesToPlainText(item.inlines)}`;
        const nested = (item.blocks || [])
          .map((child) => blockToPlainText(child, `${listPrefix}  `))
          .filter(Boolean)
          .join("\n");
        return nested ? `${line}\n${nested}` : line;
      })
      .join("\n");
  }
  if (block.type === "table") {
    return tableToPlainText(block);
  }
  if (block.type === "quote") {
    return (block.blocks || [])
      .map((child) =>
        blockToPlainText(child)
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n"),
      )
      .join("\n");
  }
  if (block.type === "code") {
    return `\`\`\`\n${block.value || ""}\n\`\`\``;
  }
  if (block.type === "rule") return "---";
  return inlinesToPlainText(block.inlines);
}

function inlinesToPlainText(inlines) {
  if (!inlines?.length) return "";
  return inlines
    .map((node) => {
      if (!node) return "";
      if (node.type === "text" || node.type === "code") return node.value || "";
      if (node.type === "math") return mathToPlainText(node.ast) || node.source || "";
      if (node.children) return inlinesToPlainText(node.children);
      return "";
    })
    .join("");
}

function tableToPlainText(block) {
  const header = (block.header || []).map((cell) => inlinesToPlainText(cell.inlines).replace(/\|/g, "\\|"));
  const rows = (block.rows || []).map((row) =>
    row.map((cell) => inlinesToPlainText(cell.inlines).replace(/\|/g, "\\|")),
  );
  if (!header.length && !rows.length) return "";
  const width = Math.max(header.length, ...rows.map((row) => row.length), 1);
  const pad = (cells) => {
    const next = [...cells];
    while (next.length < width) next.push("");
    return next;
  };
  const aligns = block.aligns || [];
  const divider = pad(header).map((_, i) => {
    if (aligns[i] === "center") return ":---:";
    if (aligns[i] === "right") return "---:";
    if (aligns[i] === "left") return ":---";
    return "---";
  });
  const lines = [];
  if (header.length) lines.push(`| ${pad(header).join(" | ")} |`);
  else lines.push(`| ${pad([]).join(" | ")} |`);
  lines.push(`| ${divider.join(" | ")} |`);
  for (const row of rows) {
    lines.push(`| ${pad(row).join(" | ")} |`);
  }
  return lines.join("\n");
}
