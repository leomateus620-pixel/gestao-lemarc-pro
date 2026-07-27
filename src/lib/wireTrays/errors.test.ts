import { describe, expect, it } from "vitest";
import { normalizeWireTrayError, shouldRetryWireTrayQuery } from "./errors";
import { throwWireTrayDataError } from "@/lib/api/wireTrayShared";

describe("wire tray error normalization", () => {
  it("hides missing relation and schema-cache details", () => {
    const feedback = normalizeWireTrayError(
      new Error("Could not find the table 'public.wire_tray_orders' in the schema cache"),
    );

    expect(feedback).toEqual(
      expect.objectContaining({
        kind: "schema",
        description: "A estrutura deste módulo ainda não está disponível no banco de dados.",
      }),
    );
    expect(feedback.description).not.toContain("wire_tray_orders");
  });

  it("preserves safe domain validation messages", () => {
    expect(
      normalizeWireTrayError(new Error("WIRE_TRAY_VALIDATION:Informe uma quantidade válida.")),
    ).toEqual(
      expect.objectContaining({
        kind: "validation",
        description: "Informe uma quantidade válida.",
      }),
    );
  });

  it("retries only transient network failures and with a finite limit", () => {
    const connection = new Error("WIRE_TRAY_CONNECTION:Não foi possível consultar os dados.");
    expect(shouldRetryWireTrayQuery(0, connection)).toBe(true);
    expect(shouldRetryWireTrayQuery(1, connection)).toBe(true);
    expect(shouldRetryWireTrayQuery(2, connection)).toBe(false);
    expect(shouldRetryWireTrayQuery(0, new Error("PGRST205 schema cache"))).toBe(false);
    expect(shouldRetryWireTrayQuery(0, new Error("permission denied"))).toBe(false);
  });

  it("converts Supabase technical failures into a structured module error", () => {
    expect(() =>
      throwWireTrayDataError({
        code: "PGRST205",
        message: "Could not find the table public.wire_tray_orders in the schema cache",
      }),
    ).toThrow(
      "WIRE_TRAY_SCHEMA:A estrutura deste módulo ainda não está disponível no banco de dados.",
    );
  });
});
