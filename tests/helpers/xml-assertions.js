import { expect } from "vitest";
import { xml2js } from "xml-js";

export function assertWellFormedDocumentXml(xml) {
  expect(xml).not.toContain("<undefined>");
  expect(xml).not.toContain("</undefined>");
  expect(() => xml2js(xml, { compact: false })).not.toThrow();
  const parsed = xml2js(xml, { compact: false });
  expect(parsed.elements?.[0]?.name).toBe("w:document");
}

export function expectOmmlElements(xml, tags) {
  for (const tag of tags) {
    expect(xml).toContain(tag);
  }
}
