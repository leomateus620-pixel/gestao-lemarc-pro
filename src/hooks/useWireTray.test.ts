import { describe, expect, it } from "vitest";
import { wireTrayKeys } from "./useWireTray";

describe("wire tray query keys", () => {
  it("keeps list filters inside their own stable module group", () => {
    const filters = { search: "LT", page: 2, pageSize: 25 };
    expect(wireTrayKeys.products(filters)).toEqual(["wire-trays", "products", filters]);
    expect(wireTrayKeys.products(filters).slice(0, 2)).toEqual(wireTrayKeys.productLists);
  });

  it("separates lists and details for targeted invalidation", () => {
    expect(wireTrayKeys.order("order-id")).toEqual(["wire-trays", "order", "order-id"]);
    expect(wireTrayKeys.productionDetail("production-id")).toEqual([
      "wire-trays",
      "production-detail",
      "production-id",
    ]);
    expect(wireTrayKeys.orderDetails).not.toEqual(wireTrayKeys.orderLists);
  });
});
