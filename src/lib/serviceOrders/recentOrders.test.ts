import { describe, expect, it } from "vitest";
import { getRecentServiceOrders, type RecentServiceOrderLike } from "./recentOrders";

function order(partial: Partial<RecentServiceOrderLike>): RecentServiceOrderLike {
  return {
    id: "order-a",
    number: 1001,
    opened_at: "2026-07-01T10:00:00.000Z",
    created_at: "2026-07-01T09:00:00.000Z",
    updated_at: "2026-07-01T11:00:00.000Z",
    ...partial,
  };
}

describe("getRecentServiceOrders", () => {
  it("sorts out-of-order input from newest to oldest", () => {
    const orders = [
      order({ id: "old", number: 1001, opened_at: "2026-07-01T10:00:00.000Z" }),
      order({ id: "new", number: 1002, opened_at: "2026-07-03T10:00:00.000Z" }),
      order({ id: "middle", number: 1003, opened_at: "2026-07-02T10:00:00.000Z" }),
    ];

    expect(getRecentServiceOrders(orders).map((item) => item.id)).toEqual(["new", "middle", "old"]);
  });

  it("uses opened_at before created_at and updated_at", () => {
    const orders = [
      order({
        id: "created-newer",
        number: 1001,
        opened_at: "2026-07-01T10:00:00.000Z",
        created_at: "2026-07-05T10:00:00.000Z",
        updated_at: "2026-07-06T10:00:00.000Z",
      }),
      order({
        id: "opened-newer",
        number: 1002,
        opened_at: "2026-07-02T10:00:00.000Z",
        created_at: "2026-07-01T10:00:00.000Z",
        updated_at: "2026-07-01T11:00:00.000Z",
      }),
    ];

    expect(getRecentServiceOrders(orders).map((item) => item.id)).toEqual([
      "opened-newer",
      "created-newer",
    ]);
  });

  it("falls back to created_at and then updated_at when earlier priority dates are invalid", () => {
    const orders = [
      order({
        id: "updated-fallback",
        number: 1001,
        opened_at: null,
        created_at: "invalid-date",
        updated_at: "2026-07-04T10:00:00.000Z",
      }),
      order({
        id: "created-fallback",
        number: 1002,
        opened_at: "invalid-date",
        created_at: "2026-07-05T10:00:00.000Z",
        updated_at: "2026-07-01T10:00:00.000Z",
      }),
    ];

    expect(getRecentServiceOrders(orders).map((item) => item.id)).toEqual([
      "created-fallback",
      "updated-fallback",
    ]);
  });

  it("slices after sorting", () => {
    const orders = [
      order({ id: "old-a", number: 1001, opened_at: "2026-07-01T10:00:00.000Z" }),
      order({ id: "old-b", number: 1002, opened_at: "2026-07-02T10:00:00.000Z" }),
      order({ id: "new-a", number: 1003, opened_at: "2026-07-05T10:00:00.000Z" }),
      order({ id: "new-b", number: 1004, opened_at: "2026-07-04T10:00:00.000Z" }),
      order({ id: "new-c", number: 1005, opened_at: "2026-07-03T10:00:00.000Z" }),
    ];

    expect(getRecentServiceOrders(orders, 3).map((item) => item.id)).toEqual([
      "new-a",
      "new-b",
      "new-c",
    ]);
  });

  it("keeps undated orders below dated orders with predictable tiebreakers", () => {
    const orders = [
      order({
        id: "undated-low",
        number: 1001,
        opened_at: null,
        created_at: null,
        updated_at: null,
      }),
      order({ id: "dated", number: 1002, opened_at: "2026-07-01T10:00:00.000Z" }),
      order({
        id: "undated-high",
        number: 1003,
        opened_at: null,
        created_at: "invalid-date",
        updated_at: null,
      }),
    ];

    expect(getRecentServiceOrders(orders).map((item) => item.id)).toEqual([
      "dated",
      "undated-high",
      "undated-low",
    ]);
  });

  it("does not mutate the source array", () => {
    const orders = [
      order({ id: "old", number: 1001, opened_at: "2026-07-01T10:00:00.000Z" }),
      order({ id: "new", number: 1002, opened_at: "2026-07-02T10:00:00.000Z" }),
    ];
    const originalIds = orders.map((item) => item.id);

    getRecentServiceOrders(orders);

    expect(orders.map((item) => item.id)).toEqual(originalIds);
  });
});
