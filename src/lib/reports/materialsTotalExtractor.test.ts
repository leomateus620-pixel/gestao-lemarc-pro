import { describe, it, expect } from "vitest";
import { findTotalLiquidoInText } from "./materialsTotalExtractor";

describe("findTotalLiquidoInText", () => {
  it("extracts standard pt-BR value", () => {
    expect(findTotalLiquidoInText("Total Líquido 12.445,02")).toEqual({ cents: 1244502 });
  });
  it("handles whitespace and colon between label and number", () => {
    expect(findTotalLiquidoInText("TOTAL LÍQUIDO :   1.234.567,89")).toEqual({
      cents: 123456789,
    });
  });
  it("handles values without decimals", () => {
    expect(findTotalLiquidoInText("Total Liquido 85")).toEqual({ cents: 8500 });
  });
  it("returns not_found when label missing", () => {
    expect(findTotalLiquidoInText("Subtotal: 500,00")).toEqual({
      cents: null,
      reason: "not_found",
    });
  });
  it("prefers the last occurrence when multiple matches", () => {
    const text = "Total Líquido 100,00\n...detalhes...\nTotal Líquido 250,00";
    expect(findTotalLiquidoInText(text)).toEqual({ cents: 25000 });
  });
  it("tolerates label without accent and line breaks", () => {
    expect(findTotalLiquidoInText("Total\nLiquido\n1.520,00")).toEqual({ cents: 152000 });
  });
});