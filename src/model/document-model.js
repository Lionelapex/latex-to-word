import { containsFailed, walkMath } from "./math-ast.js";

export function createDocument(blocks = []) {
  const stats = collectStats(blocks);
  return { type: "document", blocks, stats };
}

export function collectStats(blocks) {
  const stats = { converted: 0, warnings: 0, failed: 0 };
  walkBlocks(blocks, (node) => {
    if (node.type !== "math") return;
    if (!node.ast || node.ast.type === "failed") {
      stats.failed += 1;
      return;
    }
    if (containsFailed(node.ast) || node.warning) {
      stats.warnings += 1;
      return;
    }
    stats.converted += 1;
  });
  return stats;
}

export function walkBlocks(blocks, visitor) {
  if (!blocks) return;
  for (const block of blocks) {
    visitor(block);
    if (block.inlines) walkInlines(block.inlines, visitor);
    if (block.items) {
      for (const item of block.items) {
        if (item.inlines) walkInlines(item.inlines, visitor);
        if (item.blocks) walkBlocks(item.blocks, visitor);
      }
    }
    if (block.rows) {
      for (const row of block.rows) {
        for (const cell of row.cells || row) {
          const inlines = cell.inlines || cell;
          if (Array.isArray(inlines) && inlines[0] && inlines[0].type) {
            walkInlines(inlines, visitor);
          } else if (cell.inlines) {
            walkInlines(cell.inlines, visitor);
          }
        }
      }
    }
    if (block.header) {
      for (const cell of block.header) {
        if (cell.inlines) walkInlines(cell.inlines, visitor);
      }
    }
    if (block.blocks) walkBlocks(block.blocks, visitor);
  }
}

export function walkInlines(inlines, visitor) {
  if (!inlines) return;
  for (const node of inlines) {
    visitor(node);
    if (node.children) walkInlines(node.children, visitor);
    if (node.type === "math" && node.ast) {
      walkMath(node.ast, visitor);
    }
  }
}

export function listFailedMath(document) {
  const failed = [];
  walkBlocks(document.blocks, (node) => {
    if (node.type === "math" && (node.ast?.type === "failed" || containsFailed(node.ast))) {
      failed.push(node);
    }
  });
  return failed;
}
