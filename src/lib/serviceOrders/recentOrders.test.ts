import { describe, expect, it } from "vitest";
import { getRecentServiceOrders, type RecentServiceOrderLike } from "./recentOrders";

function order(partial: Partial<RecentServiceOrderLike>): RecentServiceOrderLike {
  return {
    id: "order-a",
    number: 1001,
    opened_at: null,
    created_at: null,
    updated_at: null,
    ...partial,
  };
}

describe("getRecentServiceOrders", () => {
  it("sorts out-of-order input from newest to oldest", () => {
    const orders = [
      order({ id: "old", number: 1001, created_at: "2026-07-01T10:00:00.000Z" }),
      order({ id: "new", number: 1002, created_at: "2026-07-03T10:00:00.000Z" }),
      order({ id: "middle", number: 1003, created_at: "2026-07-02T10:00:00.000Z" }),
    ];

    expect(getRecentServiceOrders(orders).map((item) => item.id)).toEqual(["new", "middle", "old"]);
  });

  it("uses created_at before opened_at and updated_at", () => {
    const orders = [
      order({
        id: "opened-newer",
        number: 1001,
        opened_at: "2026-07-06T10:00:00.000Z",
        created_at: "2026-07-01T10:00:00.000Z",
        updated_at: "2026-07-06T10:00:00.000Z",
      }),
      order({
        id: "created-newer",
        number: 1002,
        opened_at: "2026-07-02T10:00:00.000Z",
        created_at: "2026-07-05T10:00:00.000Z",
        updated_at: "2026-07-01T11:00:00.000Z",
      }),
    ];

    expect(getRecentServiceOrders(orders).map((item) => item.id)).toEqual([
      "created-newer",
      "opened-newer",
    ]);
  });

  it("falls back to opened_at when created_at is missing or invalid", () => {
    const orders = [
      order({
        id: "opened-old",
        number: 1001,
        opened_at: "2026-07-04T10:00:00.000Z",
        created_at: null,
        updated_at: "2026-07-07T10:00:00.000Z",
      }),
      order({
        id: "opened-new",
        number: 1002,
        opened_at: "2026-07-05T10:00:00.000Z",
        created_at: "invalid-date",
        updated_at: "2026-07-01T10:00:00.000Z",
      }),
    ];

    expect(getRecentServiceOrders(orders).map((item) => item.id)).toEqual([
      "opened-new",
      "opened-old",
    ]);
  });

  it("falls back to updated_at when created_at and opened_at are missing or invalid", () => {
    const orders = [
      order({
        id: "updated-old",
        number: 1001,
        opened_at: null,
        created_at: "invalid-date",
        updated_at: "2026-07-04T10:00:00.000Z",
      }),
      order({
        id: "updated-new",
        number: 1002,
        opened_at: "invalid-date",
        created_at: null,
        updated_at: "2026-07-05T10:00:00.000Z",
      }),
    ];

    expect(getRecentServiceOrders(orders).map((item) => item.id)).toEqual([
      "updated-new",
      "updated-old",
    ]);
  });

  it("slices after sorting", () => {
    const orders = [
      order({ id: "old-a", number: 1001, created_at: "2026-07-01T10:00:00.000Z" }),
      order({ id: "old-b", number: 1002, created_at: "2026-07-02T10:00:00.000Z" }),
      order({ id: "new-a", number: 1003, created_at: "2026-07-05T10:00:00.000Z" }),
      order({ id: "new-b", number: 1004, created_at: "2026-07-04T10:00:00.000Z" }),
      order({ id: "new-c", number: 1005, created_at: "2026-07-03T10:00:00.000Z" }),
    ];

    expect(getRecentServiceOrders(orders, 3).map((item) => item.id)).toEqual([
      "new-a",
      "new-b",
      "new-c",
    ]);
  });

  it("uses higher OS number when dates are missing or equal", () => {
    const orders = [
      order({
        id: "undated-low",
        number: 1001,
      }),
      order({
        id: "undated-high",
        number: 1003,
      }),
    ];

    expect(getRecentServiceOrders(orders).map((item) => item.id)).toEqual([
      "undated-high",
      "undated-low",
    ]);
  });

  it("keeps undated orders below dated orders with predictable tiebreakers", () => {
    const orders = [
      order({ id: "undated-low", number: 1001 }),
      order({ id: "dated", number: 1002, updated_at: "2026-07-01T10:00:00.000Z" }),
      order({ id: "undated-high", number: 1003, created_at: "invalid-date" }),
    ];

    expect(getRecentServiceOrders(orders).map((item) => item.id)).toEqual([
      "dated",
      "undated-high",
      "undated-low",
    ]);
  });

  it("uses id as the final deterministic fallback", () => {
    const orders = [order({ id: "order-b", number: 1001 }), order({ id: "order-a", number: 1001 })];

    expect(getRecentServiceOrders(orders).map((item) => item.id)).toEqual(["order-a", "order-b"]);
  });

  it("does not mutate the source array", () => {
    const orders = [
      order({ id: "old", number: 1001, created_at: "2026-07-01T10:00:00.000Z" }),
      order({ id: "new", number: 1002, created_at: "2026-07-02T10:00:00.000Z" }),
    ];
    const originalIds = orders.map((item) => item.id);

    getRecentServiceOrders(orders);

    expect(orders.map((item) => item.id)).toEqual(originalIds);
  });
});
