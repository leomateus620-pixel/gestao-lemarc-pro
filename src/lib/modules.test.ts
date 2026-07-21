import { describe, expect, it } from "vitest";
import { safeInternalDestination } from "./modules";

describe("safeInternalDestination", () => {
  it("preserves a destination inside the selected module", () => {
    expect(safeInternalDestination("/leitos/pedidos/123?origem=estoque", "wire_trays")).toBe(
      "/leitos/pedidos/123?origem=estoque",
    );
    expect(safeInternalDestination("/ordens/123", "os")).toBe("/ordens/123");
  });

  it("falls back to the module home for cross-module destinations", () => {
    expect(safeInternalDestination("/dashboard", "wire_trays")).toBe("/leitos");
    expect(safeInternalDestination("/leitos", "os")).toBe("/dashboard");
  });

  it("never redirects an authenticated user back to the login route", () => {
    expect(
      safeInternalDestination("/login?module=wire_trays&redirect=%2Fleitos", "wire_trays"),
    ).toBe("/leitos");
    expect(safeInternalDestination("/login#recuperacao", "os")).toBe("/dashboard");
  });

  it("rejects external and malformed destinations", () => {
    expect(safeInternalDestination("//example.com/roubo", "wire_trays")).toBe("/leitos");
    expect(safeInternalDestination("https://example.com", "os")).toBe("/dashboard");
  });
});
