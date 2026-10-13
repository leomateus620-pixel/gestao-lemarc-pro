import { afterEach, describe, expect, it, vi } from "vitest";
import { readPreferredModule, storePreferredModule, safeInternalDestination } from "./modules";

describe("preferred module", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("remembers and replaces the selected operation", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } });
    expect(readPreferredModule()).toBe(null);
    storePreferredModule("os");
    expect(values.get("lemarc.preferred-module")).toBe("os");
    expect(readPreferredModule()).toBe("os");
    storePreferredModule("wire_trays");
    expect(readPreferredModule()).toBe("wire_trays");
  });
  it("ignores invalid saved values", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => "admin" } });
    expect(readPreferredModule()).toBe(null);
  });
  it("continues when storage is unavailable", () => {
    vi.stubGlobal("window", { localStorage: {
      getItem: () => { throw new Error("Unavailable"); },
      setItem: () => { throw new Error("Unavailable"); },
    } });
    expect(readPreferredModule()).toBe(null);
    expect(() => storePreferredModule("os")).not.toThrow();
  });
});

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
