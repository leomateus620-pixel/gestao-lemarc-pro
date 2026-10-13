import { describe, expect, it } from "vitest";
import { isAdminAccessOpen } from "./loginPresentation";

describe("administrator login presentation", () => {
  it("is closed by default", () => expect(isAdminAccessOpen(undefined)).toBe(false));
  it("opens for admin=1", () => expect(isAdminAccessOpen("1")).toBe(true));
  it("ignores invalid parameters", () => {
    for (const value of ["0", "true", "admin", 1, undefined]) {
      expect(isAdminAccessOpen(value)).toBe(false);
    }
  });
  it("opens only by explicit action otherwise", () => {
    expect(isAdminAccessOpen(undefined, true)).toBe(true);
    expect(isAdminAccessOpen(undefined, false)).toBe(false);
  });
});