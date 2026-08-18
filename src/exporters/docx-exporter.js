import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
} from "docx";
import { astToInlineMath } from "../renderers/omml-renderer.js";

const HEADING = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

export async function documentToDocxBlob(documentModel) {
  const doc = buildDocument(documentModel);
  return Packer.toBlob(doc);
}

export async function documentToDocxBuffer(documentModel) {
  const doc = buildDocument(documentModel);
  return Packer.toBuffer(doc);
}

export function buildDocument(documentModel) {
  const children = [];
  for (const block of documentModel.blocks || []) {
    children.push(...blockToDocx(block));
  }
  if (!children.length) {
    children.push(new Paragraph({ children: [new TextRun("")] }));
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "math-to-word-bullets",
          levels: [0, 1, 2, 3].map((level) => ({
            level,
            format: LevelFormat.BULLET,
            text: ["•", "◦", "▪", "•"][level],
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.5 * (level + 1)), hanging: convertInchesToTwip(0.25) } } },
          })),
        },
        {
          reference: "math-to-word-numbers",
          levels: [0, 1, 2, 3].map((level) => ({
            level,
            format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN, LevelFormat.DECIMAL][level],
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.5 * (level + 1)), hanging: convertInchesToTwip(0.25) } } },
          })),
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });
}

function blockToDocx(block, listContext = null) {
  if (block.type === "heading") {
    return [
      new Paragraph({
        heading: HEADING[block.level] || HeadingLevel.HEADING_1,
        spacing: { after: 120 },
        children: inlinesToDocx(block.inlines || []),
      }),
    ];
  }
  if (block.type === "paragraph") {
    return paragraphInlinesToDocx(block.inlines || []);
  }
  if (block.type === "math") {
    return [displayMathParagraph(block.ast)];
  }
  if (block.type === "list") {
    return listToDocx(block, 0);
  }
  if (block.type === "table") {
    return [tableToDocx(block)];
  }
  if (block.type === "quote") {
    return quoteToDocx(block);
  }
  if (block.type === "code") {
    const lines = String(block.value || "").split("\n");
    return lines.map(
      (line) =>
        new Paragraph({
          shading: { type: "clear", fill: "F5F5F5" },
          children: [new TextRun({ text: line || " ", font: "Consolas", size: 20 })],
        }),
    );
  }
  if (block.type === "rule") {
    return [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } },
        children: [new TextRun("")],
      }),
    ];
  }
  return [];
}

function displayMathParagraph(ast) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    children: [astToInlineMath(ast)],
  });
}

function paragraphInlinesToDocx(inlines) {
  const groups = [];
  let current = [];
  const flush = () => {
    if (!current.length) return;
    groups.push(
      new Paragraph({
        spacing: { after: 200 },
        children: inlinesToDocx(current),
      }),
    );
    current = [];
  };
  for (const node of inlines || []) {
    if (node.type === "math" && node.display) {
      flush();
      groups.push(displayMathParagraph(node.ast));
    } else {
      current.push(node);
    }
  }
  flush();
  return groups.length ? groups : [new Paragraph({ children: [new TextRun("")] })];
}

function quoteToDocx(block) {
  const out = [];
  for (const child of block.blocks || []) {
    if (child.type === "paragraph") {
      out.push(
        new Paragraph({
          indent: { left: convertInchesToTwip(0.5) },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: "999999", space: 8 } },
          children: inlinesToDocx(child.inlines || []),
        }),
      );
    } else {
      out.push(...blockToDocx(child));
    }
  }
  return out;
}

function listToDocx(block, level) {
  const reference = block.ordered ? "math-to-word-numbers" : "math-to-word-bullets";
  const out = [];
  for (const item of block.items || []) {
    out.push(
      new Paragraph({
        numbering: { reference, level: Math.min(level, 3) },
        children: inlinesToDocx(item.inlines || []),
      }),
    );
    for (const child of item.blocks || []) {
      if (child.type === "list") out.push(...listToDocx(child, level + 1));
      else out.push(...blockToDocx(child));
    }
  }
  return out;
}

function tableToDocx(block) {
  const columnCount = Math.max(block.header?.length || 0, ...(block.rows || []).map((row) => row.length));
  const width = Math.floor(9000 / Math.max(columnCount, 1));
  const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
  const borders = { top: border, bottom: border, left: border, right: border };

  const headerRow = new TableRow({
    tableHeader: true,
    children: (block.header || []).map(
      (cell, i) =>
        new TableCell({
          borders,
          width: { size: width, type: WidthType.DXA },
          shading: { type: "clear", fill: "F2F2F2" },
          children: [
            new Paragraph({
              alignment: align(block.aligns?.[i]),
              children: inlinesToDocx(cell.inlines || []),
            }),
          ],
        }),
    ),
  });

  const rows = (block.rows || []).map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell, i) =>
            new TableCell({
              borders,
              width: { size: width, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: align(block.aligns?.[i]),
                  children: inlinesToDocx(cell.inlines || []),
                }),
              ],
            }),
        ),
      }),
  );

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [headerRow, ...rows],
  });
}

function align(value) {
  if (value === "center") return AlignmentType.CENTER;
  if (value === "right") return AlignmentType.RIGHT;
  return AlignmentType.LEFT;
}

function inlinesToDocx(inlines, marks = {}) {
  const out = [];
  for (const node of inlines || []) {
    if (node.type === "text") {
      if (!node.value) continue;
      out.push(
        new TextRun({
          text: node.value,
          bold: Boolean(marks.bold),
          italics: Boolean(marks.italic),
        }),
      );
      continue;
    }
    if (node.type === "strong") {
      out.push(...inlinesToDocx(node.children || [], { ...marks, bold: true }));
      continue;
    }
    if (node.type === "emphasis") {
      out.push(...inlinesToDocx(node.children || [], { ...marks, italic: true }));
      continue;
    }
    if (node.type === "code") {
      out.push(new TextRun({ text: node.value || "", font: "Consolas" }));
      continue;
    }
    if (node.type === "math") {
      out.push(astToInlineMath(node.ast));
    }
  }
  return out.length ? out : [new TextRun("")];
}
