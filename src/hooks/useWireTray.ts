import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWireTrayDashboard } from "@/lib/api/wireTrayDashboard.functions";
import {
  getWireTrayProductDetail,
  listWireTrayLocations,
  listWireTrayProducts,
} from "@/lib/api/wireTrayProducts.functions";
import {
  listWireTrayInventory,
  listWireTrayMovements,
} from "@/lib/api/wireTrayInventory.functions";
import {
  getWireTrayOrderDetail,
  getWireTrayOrderFormOptions,
  listWireTrayOrders,
} from "@/lib/api/wireTrayOrders.functions";
import {
  getWireTrayProductionDetail,
  listWireTrayProduction,
  listWireTrayProductionFormOptions,
} from "@/lib/api/wireTrayProduction.functions";
import {
  listWireTrayBillingQueue,
  listWireTrayNotifications,
  listWireTraySeparationQueue,
} from "@/lib/api/wireTrayOperations.functions";
import { listWireTrayAccessUsers } from "@/lib/api/moduleAccess.functions";
import type {
  PaginatedResult,
  WireTrayAccessUser,
  WireTrayInventoryRow,
  WireTrayLocation,
  WireTrayMovement,
  WireTrayOrderDetail,
  WireTrayOrderFormOptions,
  WireTrayOrderSummary,
  WireTrayProduct,
  WireTrayProductDetailData,
  WireTrayProductionDetailData,
  WireTrayProductionFormOptions,
  WireTrayProductionSummary,
} from "@/types/wireTray";

export const wireTrayKeys = {
  all: ["wire-trays"] as const,
  dashboard: ["wire-trays", "dashboard"] as const,
  products: (filters: unknown) => ["wire-trays", "products", filters] as const,
  product: (id: string) => ["wire-trays", "product", id] as const,
  locations: ["wire-trays", "locations"] as const,
  inventory: (filters: unknown) => ["wire-trays", "inventory", filters] as const,
  movements: (filters: unknown) => ["wire-trays", "movements", filters] as const,
  orders: (filters: unknown) => ["wire-trays", "orders", filters] as const,
  order: (id: string) => ["wire-trays", "order", id] as const,
  orderOptions: ["wire-trays", "order-options"] as const,
  production: (filters: unknown) => ["wire-trays", "production", filters] as const,
  productionDetail: (id: string) => ["wire-trays", "production-detail", id] as const,
  productionOptions: ["wire-trays", "production-options"] as const,
  separation: ["wire-trays", "separation"] as const,
  billing: ["wire-trays", "billing"] as const,
  notifications: ["wire-trays", "notifications"] as const,
  accessUsers: ["wire-trays", "access-users"] as const,
};

export function useWireTrayDashboardQuery() {
  const fetcher = useServerFn(getWireTrayDashboard);
  return useQuery(
    queryOptions({ queryKey: wireTrayKeys.dashboard, queryFn: () => fetcher(), staleTime: 20_000 }),
  );
}

export function useWireTrayProductsQuery(filters: {
  search: string;
  category?: string;
  active?: boolean;
  page: number;
  pageSize: number;
}) {
  const fetcher = useServerFn(listWireTrayProducts);
  return useQuery({
    queryKey: wireTrayKeys.products(filters),
    queryFn: () => fetcher({ data: filters }) as Promise<PaginatedResult<WireTrayProduct>>,
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
}

export function useWireTrayProductQuery(id: string) {
  const fetcher = useServerFn(getWireTrayProductDetail);
  return useQuery({
    queryKey: wireTrayKeys.product(id),
    queryFn: () => fetcher({ data: { id } }) as Promise<WireTrayProductDetailData | null>,
    enabled: Boolean(id),
  });
}

export function useWireTrayLocationsQuery() {
  const fetcher = useServerFn(listWireTrayLocations);
  return useQuery({
    queryKey: wireTrayKeys.locations,
    queryFn: () => fetcher() as Promise<WireTrayLocation[]>,
    staleTime: 60_000,
  });
}

export function useWireTrayInventoryQuery(filters: {
  search: string;
  health: "all" | "healthy" | "attention" | "low" | "empty";
  page: number;
  pageSize: number;
}) {
  const fetcher = useServerFn(listWireTrayInventory);
  return useQuery({
    queryKey: wireTrayKeys.inventory(filters),
    queryFn: () => fetcher({ data: filters }) as Promise<PaginatedResult<WireTrayInventoryRow>>,
    placeholderData: keepPreviousData,
  });
}

export function useWireTrayMovementsQuery(filters: {
  search: string;
  type?: string;
  productId?: string;
  page: number;
  pageSize: number;
}) {
  const fetcher = useServerFn(listWireTrayMovements);
  return useQuery({
    queryKey: wireTrayKeys.movements(filters),
    queryFn: () => fetcher({ data: filters }) as Promise<PaginatedResult<WireTrayMovement>>,
    placeholderData: keepPreviousData,
  });
}

export function useWireTrayOrdersQuery(filters: {
  search: string;
  status?: string;
  priority?: string;
  page: number;
  pageSize: number;
}) {
  const fetcher = useServerFn(listWireTrayOrders);
  return useQuery({
    queryKey: wireTrayKeys.orders(filters),
    queryFn: () => fetcher({ data: filters }) as Promise<PaginatedResult<WireTrayOrderSummary>>,
    placeholderData: keepPreviousData,
  });
}

export function useWireTrayOrderQuery(id: string) {
  const fetcher = useServerFn(getWireTrayOrderDetail);
  return useQuery({
    queryKey: wireTrayKeys.order(id),
    queryFn: () => fetcher({ data: { id } }) as Promise<WireTrayOrderDetail | null>,
    enabled: Boolean(id),
  });
}

export function useWireTrayOrderOptionsQuery() {
  const fetcher = useServerFn(getWireTrayOrderFormOptions);
  return useQuery({
    queryKey: wireTrayKeys.orderOptions,
    queryFn: () => fetcher() as Promise<WireTrayOrderFormOptions>,
    staleTime: 30_000,
  });
}

export function useWireTrayProductionQuery(filters: {
  search: string;
  status?: string;
  origin?: string;
  priority?: string;
  page: number;
  pageSize: number;
}) {
  const fetcher = useServerFn(listWireTrayProduction);
  return useQuery({
    queryKey: wireTrayKeys.production(filters),
    queryFn: () =>
      fetcher({ data: filters }) as Promise<PaginatedResult<WireTrayProductionSummary>>,
    placeholderData: keepPreviousData,
  });
}

export function useWireTrayProductionDetailQuery(id: string) {
  const fetcher = useServerFn(getWireTrayProductionDetail);
  return useQuery({
    queryKey: wireTrayKeys.productionDetail(id),
    queryFn: () => fetcher({ data: { id } }) as Promise<WireTrayProductionDetailData | null>,
    enabled: Boolean(id),
  });
}

export function useWireTrayProductionOptionsQuery() {
  const fetcher = useServerFn(listWireTrayProductionFormOptions);
  return useQuery({
    queryKey: wireTrayKeys.productionOptions,
    queryFn: () => fetcher() as Promise<WireTrayProductionFormOptions>,
    staleTime: 30_000,
  });
}

export function useWireTraySeparationQuery() {
  const fetcher = useServerFn(listWireTraySeparationQueue);
  return useQuery({
    queryKey: wireTrayKeys.separation,
    queryFn: () => fetcher(),
    staleTime: 10_000,
  });
}

export function useWireTrayBillingQuery() {
  const fetcher = useServerFn(listWireTrayBillingQueue);
  return useQuery({
    queryKey: wireTrayKeys.billing,
    queryFn: () => fetcher(),
    staleTime: 10_000,
    retry: false,
  });
}

export function useWireTrayNotificationsQuery() {
  const fetcher = useServerFn(listWireTrayNotifications);
  return useQuery({
    queryKey: wireTrayKeys.notifications,
    queryFn: () => fetcher(),
    staleTime: 15_000,
  });
}

export function useWireTrayAccessUsersQuery(enabled: boolean) {
  const fetcher = useServerFn(listWireTrayAccessUsers);
  return useQuery({
    queryKey: wireTrayKeys.accessUsers,
    queryFn: () => fetcher() as Promise<WireTrayAccessUser[]>,
    enabled,
    staleTime: 20_000,
  });
}
