import { describe, expect, it } from "vitest";
import { parseDocument } from "../../src/parser/index.js";
import {
  getMathIssueKind,
  getMathIssueMessage,
  listFailedMath,
  listMathIssues,
} from "../../src/model/document-model.js";

describe("math issue inspection", () => {
  it("lists fully failed inline math", () => {
    const doc = parseDocument("Bad $\\frac{a}{$ here.", { mode: "strict" });
    const issues = listMathIssues(doc);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      id: "math-issue-0",
      kind: "failed",
      display: false,
    });
    expect(issues[0].source).toContain("\\frac");
    expect(issues[0].message).toBeTruthy();
  });

  it("lists failed display math separately", () => {
    const doc = parseDocument("\\[\\frac{a}{$\\]", { mode: "strict" });
    const issues = listMathIssues(doc);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe("failed");
    expect(issues[0].display).toBe(true);
  });

  it("lists warnings for partially parsed math", () => {
    const doc = parseDocument("$\\frac{a}{\\unknown{x}}$", { mode: "strict" });
    const math = doc.blocks[0].inlines.find((n) => n.type === "math");
    expect(getMathIssueKind(math)).toBe("warning");
    const issues = listMathIssues(doc);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe("warning");
    expect(getMathIssueMessage(math)).toContain("Unknown command");
  });

  it("returns empty list when all math converts cleanly", () => {
    const doc = parseDocument("$x^2$ and $$\\bar{x}$$", { mode: "strict" });
    expect(listMathIssues(doc)).toHaveLength(0);
    expect(listFailedMath(doc)).toHaveLength(0);
  });

  it("assigns stable sequential ids across multiple issues", () => {
    const doc = parseDocument("$\\bad{$ and $$\\bad{$$", { mode: "strict" });
    const issues = listMathIssues(doc);
    expect(issues.map((issue) => issue.id)).toEqual(["math-issue-0", "math-issue-1"]);
  });
});
