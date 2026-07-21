import { describe, expect, it } from "vitest";
import {
  availableStock,
  canTransitionOrder,
  hasWireTrayPermission,
  orderProgress,
  orderShortage,
  projectedStock,
  replenishmentQuantity,
} from "./domain";

describe("wire tray inventory domain", () => {
  it("never exposes reserved stock as available", () => {
    expect(availableStock(100, 30)).toBe(70);
    expect(availableStock(10, 12)).toBe(0);
  });

  it("calculates projected stock with incoming stock production", () => {
    expect(projectedStock(100, 30, 20)).toBe(90);
  });

  it("splits an order into reservation and shortage", () => {
    expect(orderShortage(100, 70)).toEqual({ reserveNow: 70, productionRequired: 30 });
  });

  it("respects minimum batch and target stock", () => {
    expect(
      replenishmentQuantity({ projected: 20, minimum: 20, target: 70, minimumBatch: 50 }),
    ).toBe(50);
    expect(
      replenishmentQuantity({ projected: 19, minimum: 20, target: 100, minimumBatch: 20 }),
    ).toBe(81);
    expect(
      replenishmentQuantity({ projected: 21, minimum: 20, target: 70, minimumBatch: 50 }),
    ).toBe(0);
  });
});

describe("wire tray order and permissions domain", () => {
  it("calculates progress without exceeding one hundred percent", () => {
    expect(
      orderProgress([
        { requested: 10, checked: 10, dispatched: 10 },
        { requested: 10, checked: 5, dispatched: 0 },
      ]),
    ).toBe(70);
  });

  it("accepts only mapped status transitions", () => {
    expect(canTransitionOrder("draft", "production_pending")).toBe(true);
    expect(canTransitionOrder("ready_for_billing", "completed")).toBe(false);
  });

  it("requires an explicit financial grant for managers", () => {
    expect(hasWireTrayPermission("gestor", "view_financials", false)).toBe(false);
    expect(hasWireTrayPermission("gestor", "view_financials", true)).toBe(true);
    expect(hasWireTrayPermission("producao", "view_financials", true)).toBe(false);
  });
});
