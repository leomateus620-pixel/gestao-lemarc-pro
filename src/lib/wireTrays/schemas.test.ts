import { describe, expect, it } from "vitest";
import { wireTrayOrderDraftSchema, wireTrayProductInputSchema } from "./schemas";

describe("wire tray form schemas", () => {
  it("rejects a target below minimum stock", () => {
    const result = wireTrayProductInputSchema.safeParse({
      name: "Leito 100 mm",
      category: "straight_tray",
      unit: "piece",
      active: true,
      widthMm: 100,
      heightMm: 50,
      lengthMm: 3000,
      minimumStock: 20,
      targetStock: 10,
      minimumProductionBatch: 5,
      automaticReplenishment: true,
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one order item", () => {
    const result = wireTrayOrderDraftSchema.safeParse({
      clientId: "11111111-1111-4111-8111-111111111111",
      priority: "media",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate products in the same order", () => {
    const productId = "22222222-2222-4222-8222-222222222222";
    const result = wireTrayOrderDraftSchema.safeParse({
      clientId: "11111111-1111-4111-8111-111111111111",
      priority: "media",
      items: [
        { productId, quantity: 5, sortOrder: 0 },
        { productId, quantity: 3, sortOrder: 1 },
      ],
    });
    expect(result.success).toBe(false);
  });
});
