import {
  accent,
  atom,
  containsFailed,
  delimiter,
  failed,
  fraction,
  func,
  group,
  matrix,
  nary,
  sqrt,
  subscript,
  superscript,
  subsuperscript,
  text,
  wrap,
} from "../model/math-ast.js";
import { tokenizeLatex } from "./tokenizer.js";

export const GREEK = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  vartheta: "ϑ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  omicron: "ο",
  pi: "π",
  varpi: "ϖ",
  rho: "ρ",
  varrho: "ϱ",
  sigma: "σ",
  varsigma: "ς",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  varphi: "ϕ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
};

export const SYMBOLS = {
  neq: "≠",
  ne: "≠",
  leq: "≤",
  le: "≤",
  geq: "≥",
  ge: "≥",
  approx: "≈",
  sim: "∼",
  times: "×",
  cdot: "·",
  pm: "±",
  mp: "∓",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  subseteq: "⊆",
  supset: "⊃",
  supseteq: "⊇",
  cup: "∪",
  cap: "∩",
  to: "→",
  rightarrow: "→",
  leftarrow: "←",
  leftrightarrow: "↔",
  Rightarrow: "⇒",
  Leftarrow: "⇐",
  Leftrightarrow: "⇔",
  infty: "∞",
  cdots: "⋯",
  ldots: "…",
  dots: "…",
  vdots: "⋮",
  ddots: "⋱",
  partial: "∂",
  nabla: "∇",
  forall: "∀",
  exists: "∃",
  neg: "¬",
  lnot: "¬",
  wedge: "∧",
  vee: "∨",
  oplus: "⊕",
  otimes: "⊗",
  circ: "∘",
  bullet: "∙",
  propto: "∝",
  equiv: "≡",
  cong: "≅",
  nless: "≮",
  ll: "≪",
  gg: "≫",
  mid: "∣",
  parallel: "∥",
  perp: "⊥",
  angle: "∠",
  triangle: "△",
  square: "□",
  star: "⋆",
  ast: "∗",
  ell: "ℓ",
  hbar: "ℏ",
  Re: "ℜ",
  Im: "ℑ",
  aleph: "ℵ",
  emptyset: "∅",
  varnothing: "∅",
  prime: "′",
  degree: "°",
  percent: "%",
  dollar: "$",
  hash: "#",
  amp: "&",
  lbrace: "{",
  rbrace: "}",
  backslash: "\\",
  quad: "  ",
  qquad: "    ",
};

const ACCENTS = {
  bar: "bar",
  overline: "bar",
  hat: "hat",
  widehat: "hat",
  vec: "vec",
  tilde: "tilde",
  widetilde: "tilde",
  dot: "dot",
  ddot: "ddot",
};

const FUNCTIONS = new Set([
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "arcsin",
  "arccos",
  "arctan",
  "sinh",
  "cosh",
  "tanh",
  "log",
  "ln",
  "lg",
  "exp",
  "det",
  "dim",
  "ker",
  "deg",
  "gcd",
  "min",
  "max",
  "sup",
  "inf",
  "Pr",
  "arg",
  "hom",
]);

const NARY = {
  sum: { char: "∑", limitStyle: "undOvr" },
  prod: { char: "∏", limitStyle: "undOvr" },
  int: { char: "∫", limitStyle: "subSup" },
  iint: { char: "∬", limitStyle: "subSup" },
  iiint: { char: "∭", limitStyle: "subSup" },
  oint: { char: "∮", limitStyle: "subSup" },
  lim: { char: "lim", limitStyle: "undOvr" },
  liminf: { char: "liminf", limitStyle: "undOvr" },
  limsup: { char: "limsup", limitStyle: "undOvr" },
};

const SKIP_COMMANDS = new Set([
  "displaystyle",
  "textstyle",
  "scriptstyle",
  "scriptscriptstyle",
  "limits",
  "nolimits",
  "mathstrut",
  "!",
  ",",
  ":",
  ";",
  " ",
  "/",
]);

const RELATIONS = new Set(["=", "≠", "≤", "≥", "≈", "∼", "∈", "⊂", "⊆", "∪", "∩", "<", ">", "→", "←"]);
const BINARY_OPS = new Set(["+", "−", "-", "×", "·", "±", "∓", "*", "/"]);

class ParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "ParseError";
  }
}

export function parseLatex(source) {
  const original = String(source ?? "").trim();
  if (!original) {
    return failed(original, "Empty expression");
  }
  try {
    const parser = new LatexParser(original);
    const ast = parser.parse();
    if (containsFailed(ast) && ast.type !== "failed") {
      return ast;
    }
    return ast;
  } catch (error) {
    return failed(original, error.message || "Could not parse LaTeX");
  }
}

class LatexParser {
  constructor(source) {
    this.source = source;
    this.tokens = tokenizeLatex(source);
    this.pos = 0;
  }

  parse() {
    const children = this.parseExprUntil([]);
    this.skipSpace();
    if (this.pos < this.tokens.length) {
      const leftover = this.peek();
      if (leftover?.type === "rbrace" || leftover?.type === "rbracket" || leftover?.type === "rparen") {
        throw new ParseError(`Unmatched ${leftover.value}`);
      }
    }
    return group(children);
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset];
  }

  skipSpace() {
    while (this.peek()?.type === "space") this.pos += 1;
  }

  consume() {
    const token = this.tokens[this.pos];
    this.pos += 1;
    return token;
  }

  match(type, value) {
    const token = this.peek();
    if (!token || token.type !== type) return false;
    if (value !== undefined && token.value !== value) return false;
    this.pos += 1;
    return true;
  }

  parseExprUntil(stopTypes, { stopAlign = false } = {}) {
    const children = [];
    while (this.pos < this.tokens.length) {
      this.skipSpace();
      const token = this.peek();
      if (!token) break;
      if (stopTypes.includes(token.type)) break;
      if (stopAlign && token.type === "align") break;
      if (token.type === "command" && token.value === "\\" && stopTypes.includes("rowbreak")) break;
      if (token.type === "command" && token.value === "end") break;
      if (token.type === "command" && token.value === "right") break;
      children.push(this.parseAtomWithScripts());
    }
    return children;
  }

  parseAtomWithScripts() {
    this.skipSpace();
    let base = this.parseAtom();
    let sub = null;
    let sup = null;
    while (true) {
      this.skipSpace();
      const token = this.peek();
      if (!token) break;
      if (token.type === "sub") {
        this.pos += 1;
        sub = this.parseScriptArg();
        continue;
      }
      if (token.type === "sup") {
        this.pos += 1;
        sup = this.parseScriptArg();
        continue;
      }
      if (token.type === "symbol" && token.value === "'") {
        this.pos += 1;
        const prime = atom("operator", "′");
        sup = sup ? group([sup, prime]) : prime;
        continue;
      }
      break;
    }
    if (sub && sup) return subsuperscript(base, sub, sup);
    if (sub) return subscript(base, sub);
    if (sup) return superscript(base, sup);
    return base;
  }

  parseScriptArg() {
    this.skipSpace();
    if (this.peek()?.type === "lbrace") {
      return group(this.parseBraced());
    }
    return this.parseAtom();
  }

  parseBraced() {
    if (!this.match("lbrace")) {
      throw new ParseError("Expected '{'");
    }
    const children = this.parseExprUntil(["rbrace"]);
    if (!this.match("rbrace")) {
      throw new ParseError("Missing closing '}'");
    }
    return children;
  }

  parseGroupOrAtom() {
    this.skipSpace();
    if (this.peek()?.type === "lbrace") {
      return group(this.parseBraced());
    }
    return wrap(this.parseAtomWithScripts());
  }

  parseAtom() {
    this.skipSpace();
    const token = this.peek();
    if (!token) {
      throw new ParseError("Unexpected end of expression");
    }

    if (token.type === "letter") {
      this.pos += 1;
      return atom("variable", token.value);
    }
    if (token.type === "number") {
      this.pos += 1;
      return atom("number", token.value);
    }
    if (token.type === "command") {
      return this.parseCommand();
    }
    if (token.type === "lbrace") {
      return group(this.parseBraced());
    }
    if (token.type === "lparen") {
      return this.parseDelimited("lparen", "rparen", "(", ")");
    }
    if (token.type === "lbracket") {
      return this.parseDelimited("lbracket", "rbracket", "[", "]");
    }
    if (token.type === "symbol") {
      this.pos += 1;
      if (token.value === "-") return atom("operator", "−");
      if (token.value === "*") return atom("operator", "·");
      const kind = RELATIONS.has(token.value) || BINARY_OPS.has(token.value) || token.value === "=" ? "operator" : "symbol";
      return atom(kind, token.value);
    }
    throw new ParseError(`Unexpected token '${token.value ?? token.type}'`);
  }

  parseDelimited(openType, closeType, left, right) {
    this.pos += 1;
    const children = this.parseExprUntil([closeType]);
    if (!this.match(closeType)) {
      throw new ParseError(`Missing closing '${right}'`);
    }
    return delimiter(left, right, group(children));
  }

  parseCommand() {
    const token = this.consume();
    const name = token.value;

    if (name === "left") return this.parseLeftRight();
    if (name === "right") {
      throw new ParseError("Unmatched \\right");
    }
    if (name === "begin") return this.parseEnvironment();
    if (name === "frac" || name === "dfrac" || name === "tfrac" || name === "cfrac") {
      const numerator = this.parseGroupOrAtom();
      const denominator = this.parseGroupOrAtom();
      return fraction(numerator, denominator);
    }
    if (name === "binom" || name === "choose") {
      const n = this.parseGroupOrAtom();
      const k = this.parseGroupOrAtom();
      return delimiter("(", ")", fraction(n, k));
    }
    if (name === "sqrt") {
      let index = null;
      this.skipSpace();
      if (this.peek()?.type === "lbracket") {
        this.pos += 1;
        const idx = this.parseExprUntil(["rbracket"]);
        if (!this.match("rbracket")) throw new ParseError("Missing ']' after \\sqrt");
        index = group(idx);
      }
      const radicand = this.parseGroupOrAtom();
      return sqrt(radicand, index);
    }
    if (name === "text" || name === "mathrm" || name === "operatorname" || name === "textrm" || name === "mbox") {
      return text(this.parseTextGroup());
    }
    if (ACCENTS[name]) {
      return accent(ACCENTS[name], this.parseGroupOrAtom());
    }
    if (NARY[name]) {
      return this.parseNary(NARY[name]);
    }
    if (FUNCTIONS.has(name)) {
      return func(name, null);
    }
    if (GREEK[name]) {
      return atom("variable", GREEK[name]);
    }
    if (SYMBOLS[name]) {
      const value = SYMBOLS[name];
      const kind = RELATIONS.has(value) || BINARY_OPS.has(value) ? "operator" : "symbol";
      return atom(kind, value);
    }
    if (name === "{" || name === "}") return atom("symbol", name);
    if (name === "%" || name === "$" || name === "#" || name === "&" || name === "_") {
      return atom("symbol", name);
    }
    if (name === "\\") {
      return atom("symbol", "");
    }
    if (SKIP_COMMANDS.has(name)) {
      return atom("symbol", name === "quad" || name === "qquad" ? " " : "");
    }
    if (name === "cdotp" || name === "*") return atom("operator", "·");

    return this.parseUnknownCommand(name, token);
  }

  parseNary(spec) {
    const node = nary(spec.char, { limitStyle: spec.limitStyle, body: group([]) });
    this.skipSpace();
    let sub = null;
    let sup = null;
    while (true) {
      this.skipSpace();
      const token = this.peek();
      if (token?.type === "sub") {
        this.pos += 1;
        sub = this.parseScriptArg();
        continue;
      }
      if (token?.type === "sup") {
        this.pos += 1;
        sup = this.parseScriptArg();
        continue;
      }
      break;
    }
    node.sub = sub;
    node.sup = sup;
    node.body = this.parseNaryBody();
    return node;
  }

  parseNaryBody() {
    this.skipSpace();
    const token = this.peek();
    if (!token) return group([]);
    if (token.type === "rbrace" || token.type === "rbracket" || token.type === "rparen") {
      return group([]);
    }
    if (token.type === "align") return group([]);
    if (token.type === "command" && (token.value === "\\" || token.value === "end" || token.value === "right")) {
      return group([]);
    }
    if (token.type === "lbrace") {
      return group(this.parseBraced());
    }
    const parts = [];
    while (this.pos < this.tokens.length) {
      this.skipSpace();
      const next = this.peek();
      if (!next) break;
      if (["rbrace", "rbracket", "rparen", "align"].includes(next.type)) break;
      if (next.type === "command" && (next.value === "\\" || next.value === "end" || next.value === "right")) break;
      if (next.type === "symbol" && BINARY_OPS.has(next.value === "-" ? "−" : next.value) && parts.length > 0) {
        break;
      }
      if (next.type === "symbol" && RELATIONS.has(next.value)) break;
      if (next.type === "command" && (SYMBOLS[next.value] && RELATIONS.has(SYMBOLS[next.value]))) break;
      if (next.type === "command" && NARY[next.value] && parts.length > 0) break;
      parts.push(this.parseAtomWithScripts());
    }
    return group(parts);
  }

  parseLeftRight() {
    this.skipSpace();
    const left = this.parseDelimiterChar();
    const children = this.parseExprUntil([]);
    this.skipSpace();
    if (!(this.peek()?.type === "command" && this.peek().value === "right")) {
      throw new ParseError("Missing \\right");
    }
    this.pos += 1;
    const right = this.parseDelimiterChar();
    return delimiter(left, right, group(children));
  }

  parseDelimiterChar() {
    this.skipSpace();
    const token = this.peek();
    if (!token) throw new ParseError("Missing delimiter after \\left/\\right");
    if (token.type === "command") {
      this.pos += 1;
      if (token.value === ".") return "";
      if (token.value === "{" || token.value === "lbrace") return "{";
      if (token.value === "}" || token.value === "rbrace") return "}";
      if (token.value === "langle") return "⟨";
      if (token.value === "rangle") return "⟩";
      if (token.value === "lvert" || token.value === "vert" || token.value === "|") return "|";
      if (token.value === "lVert") return "∥";
      if (token.value === "rVert") return "∥";
      if (token.value === "backslash") return "\\";
      return token.value;
    }
    this.pos += 1;
    if (token.value === ".") return "";
    return token.value;
  }

  parseEnvironment() {
    const env = this.parseTextGroup().trim();
    const rows = [];
    let row = [];
    let cell = [];

    const pushCell = () => {
      row.push(group(cell));
      cell = [];
    };
    const pushRow = () => {
      pushCell();
      rows.push(row);
      row = [];
    };

    while (this.pos < this.tokens.length) {
      this.skipSpace();
      const token = this.peek();
      if (!token) throw new ParseError(`Missing \\end{${env}}`);
      if (token.type === "command" && token.value === "end") {
        this.pos += 1;
        const endEnv = this.parseTextGroup().trim();
        if (endEnv !== env) throw new ParseError(`Mismatched environment ${env} vs ${endEnv}`);
        pushRow();
        break;
      }
      if (token.type === "align") {
        this.pos += 1;
        pushCell();
        continue;
      }
      if (token.type === "command" && token.value === "\\") {
        this.pos += 1;
        pushRow();
        continue;
      }
      if (token.type === "command" && token.value === "hline") {
        this.pos += 1;
        continue;
      }
      cell.push(this.parseAtomWithScripts());
    }

    const kind = ["pmatrix", "bmatrix", "vmatrix", "Bmatrix"].includes(env) ? env : "matrix";
    return matrix(kind, rows);
  }

  parseTextGroup() {
    this.skipSpace();
    if (this.peek()?.type !== "lbrace") {
      const atomNode = this.parseAtom();
      if (atomNode.type === "text") return atomNode.value;
      if (atomNode.type === "atom") return atomNode.value;
      return "";
    }
    this.pos += 1;
    let out = "";
    while (this.pos < this.tokens.length) {
      const token = this.peek();
      if (token.type === "rbrace") {
        this.pos += 1;
        break;
      }
      if (token.type === "lbrace") {
        out += this.parseTextGroup();
        continue;
      }
      if (token.type === "space") {
        out += " ";
        this.pos += 1;
        continue;
      }
      if (token.type === "command") {
        this.pos += 1;
        if (GREEK[token.value]) out += GREEK[token.value];
        else if (SYMBOLS[token.value]) out += SYMBOLS[token.value];
        else if (token.value === " " || token.value === ",") out += " ";
        else out += token.value;
        continue;
      }
      out += token.value ?? "";
      this.pos += 1;
    }
    return out;
  }

  parseUnknownCommand(name, commandToken) {
    const start = commandToken?.index ?? 0;
    this.skipSpace();
    while (this.peek()?.type === "lbrace") {
      this.parseBraced();
    }
    const last = this.tokens[Math.max(0, this.pos - 1)];
    const end = last ? last.index + String(last.value ?? "").length : this.source.length;
    return failed(this.source.slice(start, end), `Unknown command \\${name}`);
  }
}

export { ParseError, FUNCTIONS, NARY, ACCENTS };
