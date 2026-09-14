import { describe, expect, it } from "vitest";
import { sumMaterialItems, type MaterialItem } from "./materialsTotals";

describe("sumMaterialItems", () => {
  it("returns null with no attachments", () => {
    expect(sumMaterialItems([])).toBeNull();
  });

  it("returns the single value with 1 attachment", () => {
    expect(sumMaterialItems([{ fileName: "a.pdf", cents: 1244502 }])).toBe(1244502);
  });

  it("sums 2 attachments", () => {
    const items: MaterialItem[] = [
      { fileName: "a.pdf", cents: 1244502 },
      { fileName: "b.pdf", cents: 85000 },
    ];
    expect(sumMaterialItems(items)).toBe(1329502);
  });

  it("sums 3+ attachments", () => {
    expect(
      sumMaterialItems([
        { fileName: "a", cents: 100 },
        { fileName: "b", cents: 200 },
        { fileName: "c", cents: 300 },
      ]),
    ).toBe(600);
  });

  it("ignores unreadable files but keeps the partial sum", () => {
    expect(
      sumMaterialItems([
        { fileName: "a", cents: 5000 },
        { fileName: "b", cents: null, reason: "not_found" },
      ]),
    ).toBe(5000);
  });

  it("returns null when every attachment failed", () => {
    expect(
      sumMaterialItems([
        { fileName: "a", cents: null, reason: "parse_error" },
        { fileName: "b", cents: null, reason: "not_found" },
      ]),
    ).toBeNull();
  });
});
