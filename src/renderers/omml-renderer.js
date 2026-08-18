import {
  ImportedXmlComponent,
  Math as DocxMath,
  MathAngledBrackets,
  MathCurlyBrackets,
  MathFraction,
  MathFunction,
  MathIntegral,
  MathRadical,
  MathRoundBrackets,
  MathRun,
  MathSquareBrackets,
  MathSubScript,
  MathSubSuperScript,
  MathSum,
  MathSuperScript,
} from "docx";
import { xml2js } from "xml-js";
import { escapeXml } from "../utils/xml.js";

const MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math";

export function astToMathComponents(ast) {
  const parts = flatten(ast);
  return parts.length ? parts : [new MathRun("")];
}

export function astToInlineMath(ast) {
  return new DocxMath({ children: astToMathComponents(ast) });
}

export function toOmmlXml(ast, { display = false } = {}) {
  const inner = serialize(ast);
  if (display) {
    return `<m:oMathPara xmlns:m="${MATH_NS}"><m:oMathParaPr><m:jc m:val="center"/></m:oMathParaPr><m:oMath>${inner}</m:oMath></m:oMathPara>`;
  }
  return `<m:oMath xmlns:m="${MATH_NS}">${inner}</m:oMath>`;
}

function flatten(node) {
  if (!node) return [];
  switch (node.type) {
    case "group":
      return (node.children || []).flatMap(flatten);
    case "atom":
      return node.value ? [new MathRun(node.value)] : [];
    case "text":
      return hatch(textRunXml(node.value));
    case "superscript":
      return [
        new MathSuperScript({
          children: ensure(flatten(node.base)),
          superScript: ensure(flatten(node.exponent)),
        }),
      ];
    case "subscript":
      return [
        new MathSubScript({
          children: ensure(flatten(node.base)),
          subScript: ensure(flatten(node.sub)),
        }),
      ];
    case "subsuperscript":
      return [
        new MathSubSuperScript({
          children: ensure(flatten(node.base)),
          subScript: ensure(flatten(node.sub)),
          superScript: ensure(flatten(node.sup)),
        }),
      ];
    case "fraction":
      return [
        new MathFraction({
          numerator: ensure(flatten(node.numerator)),
          denominator: ensure(flatten(node.denominator)),
        }),
      ];
    case "sqrt":
      return [
        new MathRadical({
          children: ensure(flatten(node.radicand)),
          degree: node.index ? ensure(flatten(node.index)) : undefined,
        }),
      ];
    case "function":
      if (node.argument) {
        return [
          new MathFunction({
            name: [new MathRun(node.name)],
            children: ensure(flatten(node.argument)),
          }),
        ];
      }
      return hatch(runXml(node.name, true));
    case "nary":
      return flattenNary(node);
    case "accent":
      return hatch(serialize(node));
    case "delimiter":
      return flattenDelimiter(node);
    case "matrix":
      return hatch(serialize(node));
    case "failed":
      return [new MathRun(node.source || "")];
    default:
      return node.source ? [new MathRun(node.source)] : [];
  }
}

function flattenNary(node) {
  const body = ensure(flatten(node.body));
  const subScript = node.sub ? ensure(flatten(node.sub)) : undefined;
  const superScript = node.sup ? ensure(flatten(node.sup)) : undefined;
  if (node.operator === "∑") {
    return [new MathSum({ children: body, subScript, superScript })];
  }
  if (node.operator === "∫" || node.operator === "∬" || node.operator === "∭" || node.operator === "∮") {
    return [new MathIntegral({ children: body, subScript, superScript })];
  }
  return hatch(serialize(node));
}

function flattenDelimiter(node) {
  const children = ensure(flatten(node.body));
  if (node.left === "(" && node.right === ")") return [new MathRoundBrackets({ children })];
  if (node.left === "[" && node.right === "]") return [new MathSquareBrackets({ children })];
  if (node.left === "{" && node.right === "}") return [new MathCurlyBrackets({ children })];
  if (node.left === "⟨" && node.right === "⟩") return [new MathAngledBrackets({ children })];
  return hatch(serialize(node));
}

function ensure(components) {
  return components.length ? components : [new MathRun("")];
}

function hatch(xmlFragment) {
  return [ommlFromXmlFragment(xmlFragment)];
}

function ommlFromXmlFragment(xmlFragment) {
  const parsed = xml2js(xmlFragment, { compact: false });
  const root = parsed.elements?.[0];
  if (!root) return new MathRun("");
  const component = convertToImportedXml(root);
  return component ?? new MathRun("");
}

function convertToImportedXml(element) {
  switch (element.type) {
    case "element": {
      const component = new ImportedXmlComponent(element.name, element.attributes);
      for (const child of element.elements || []) {
        const converted = convertToImportedXml(child);
        if (converted !== undefined) component.push(converted);
      }
      return component;
    }
    case "text":
      return element.text;
    default:
      return undefined;
  }
}

function textRunXml(value) {
  return `<m:r><m:rPr><m:nor/></m:rPr><m:t xml:space="preserve">${escapeXml(value ?? "")}</m:t></m:r>`;
}

function serialize(node) {
  if (!node) return "";
  switch (node.type) {
    case "group":
      return (node.children || []).map(serialize).join("");
    case "atom":
      return node.value ? runXml(node.value) : "";
    case "text":
      return textRunXml(node.value);
    case "superscript":
      return `<m:sSup><m:e>${serialize(node.base)}</m:e><m:sup>${serialize(node.exponent)}</m:sup></m:sSup>`;
    case "subscript":
      return `<m:sSub><m:e>${serialize(node.base)}</m:e><m:sub>${serialize(node.sub)}</m:sub></m:sSub>`;
    case "subsuperscript":
      return `<m:sSubSup><m:e>${serialize(node.base)}</m:e><m:sub>${serialize(node.sub)}</m:sub><m:sup>${serialize(node.sup)}</m:sup></m:sSubSup>`;
    case "fraction":
      return `<m:f><m:num>${serialize(node.numerator)}</m:num><m:den>${serialize(node.denominator)}</m:den></m:f>`;
    case "sqrt":
      if (node.index) {
        return `<m:rad><m:radPr><m:degHide m:val="0"/></m:radPr><m:deg>${serialize(node.index)}</m:deg><m:e>${serialize(node.radicand)}</m:e></m:rad>`;
      }
      return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${serialize(node.radicand)}</m:e></m:rad>`;
    case "function":
      return `<m:func><m:fName>${runXml(node.name, true)}</m:fName><m:e>${node.argument ? serialize(node.argument) : ""}</m:e></m:func>`;
    case "nary":
      return serializeNary(node);
    case "accent":
      return `<m:acc><m:accPr><m:chr m:val="${escapeXml(accentChar(node.kind))}"/></m:accPr><m:e>${serialize(node.base)}</m:e></m:acc>`;
    case "delimiter":
      return `<m:d><m:dPr><m:begChr m:val="${escapeXml(node.left || "")}"/><m:endChr m:val="${escapeXml(node.right || "")}"/></m:dPr><m:e>${serialize(node.body)}</m:e></m:d>`;
    case "matrix":
      return serializeMatrix(node);
    case "failed":
      return runXml(node.source || "");
    default:
      return runXml(node.source || "");
  }
}

function serializeNary(node) {
  const hideSub = node.sub ? "0" : "1";
  const hideSup = node.sup ? "0" : "1";
  const loc = node.limitStyle === "subSup" ? "subSup" : "undOvr";
  const chr = node.operator === "lim" ? "lim" : node.operator;
  if (node.operator === "lim") {
    return `<m:limLow><m:e>${runXml("lim", true)}</m:e><m:lim>${node.sub ? serialize(node.sub) : ""}</m:lim></m:limLow>${serialize(node.body)}`;
  }
  return `<m:nary><m:naryPr><m:chr m:val="${escapeXml(chr)}"/><m:limLoc m:val="${loc}"/><m:subHide m:val="${hideSub}"/><m:supHide m:val="${hideSup}"/></m:naryPr><m:sub>${node.sub ? serialize(node.sub) : ""}</m:sub><m:sup>${node.sup ? serialize(node.sup) : ""}</m:sup><m:e>${serialize(node.body)}</m:e></m:nary>`;
}

function serializeMatrix(node) {
  const colCount = Math.max(1, ...(node.rows || []).map((row) => row.length));
  const rows = (node.rows || [])
    .map((row) => {
      const cells = [];
      for (let i = 0; i < colCount; i += 1) {
        cells.push(`<m:e>${row[i] ? serialize(row[i]) : ""}</m:e>`);
      }
      return `<m:mr>${cells.join("")}</m:mr>`;
    })
    .join("");
  const matrix = `<m:m><m:mPr><m:mcs><m:mc><m:mcPr><m:count m:val="${colCount}"/><m:mcJc m:val="center"/></m:mcPr></m:mc></m:mcs></m:mPr>${rows}</m:m>`;
  const fences = matrixFences(node.kind);
  if (!fences) return matrix;
  return `<m:d><m:dPr><m:begChr m:val="${escapeXml(fences[0])}"/><m:endChr m:val="${escapeXml(fences[1])}"/></m:dPr><m:e>${matrix}</m:e></m:d>`;
}

function matrixFences(kind) {
  if (kind === "pmatrix") return ["(", ")"];
  if (kind === "bmatrix") return ["[", "]"];
  if (kind === "Bmatrix") return ["{", "}"];
  if (kind === "vmatrix") return ["|", "|"];
  return null;
}

function runXml(value, roman = false) {
  const pr = roman ? "<m:rPr><m:nor/></m:rPr>" : "";
  return `<m:r>${pr}<m:t xml:space="preserve">${escapeXml(value ?? "")}</m:t></m:r>`;
}

function accentChar(kind) {
  if (kind === "hat") return "\u0302";
  if (kind === "vec") return "\u2192";
  if (kind === "tilde") return "\u0303";
  if (kind === "dot") return "\u0307";
  if (kind === "ddot") return "\u0308";
  return "\u0305";
}

export { MATH_NS };
