import { describe, expect, it } from "vitest";
import type { TechnicianLaborHistoryRow } from "@/lib/api/financials.functions";
import { buildCollaboratorOperationalDashboard } from "@/lib/serviceOrders/collaborators";
import type { ServiceOrder, TechnicianLite } from "@/types/serviceOrder";

const technicians: TechnicianLite[] = [
  { id: "tech-001", full_name: "Ana Ferreira", role: "Técnica", hourly_rate_cents: 12500 },
  { id: "tech-002", full_name: "Bruno Lima", role: "Auxiliar", hourly_rate_cents: 9000 },
];

function order(partial: Partial<ServiceOrder>): ServiceOrder {
  return {
    id: "order-1",
    number: 1001,
    title: "Manutenção de prensa",
    description: "Troca e ajuste operacional",
    client_id: "client-1",
    client_unit_id: null,
    technician_id: null,
    service_type: "mecanica",
    service_type_other: null,
    priority: "media",
    status: "approved",
    location: null,
    requester_name: null,
    scheduled_for: null,
    opened_at: "2026-06-01T12:00:00.000Z",
    started_at: "2026-06-03T10:00:00.000Z",
    finished_at: "2026-06-03T12:00:00.000Z",
    approved_at: "2026-06-03T13:00:00.000Z",
    closed_at: "2026-06-03T13:00:00.000Z",
    hour_rate: 120,
    worked_minutes: 120,
    created_by: "user-1",
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-03T13:00:00.000Z",
    client: { id: "client-1", name: "Metal Norte", unit: null },
    technician: null,
    technicians: [],
    client_unit: null,
    ...partial,
  };
}

describe("buildCollaboratorOperationalDashboard", () => {
  it("aggregates monthly labor entries with real values per collaborator", () => {
    const laborHistory: TechnicianLaborHistoryRow[] = [
      {
        id: "entry-1",
        service_order_id: "order-1",
        technician_id: "tech-001",
        role: "Responsável",
        work_date: "2026-06-03",
        start_time: "10:00:00",
        end_time: "12:00:00",
        duration_minutes: 120,
        hourly_rate_cents: 12500,
        subtotal_cents: 25000,
        description: "Ajuste final e testes",
        service_order: {
          id: "order-1",
          number: 1001,
          title: "Manutenção de prensa",
          status: "approved",
          opened_at: "2026-06-01T12:00:00.000Z",
          started_at: "2026-06-03T10:00:00.000Z",
          finished_at: "2026-06-03T12:00:00.000Z",
          closed_at: "2026-06-03T13:00:00.000Z",
          service_type: "mecanica",
          service_type_other: null,
          client: { id: "client-1", name: "Metal Norte", unit: null },
          client_unit: null,
        },
      },
    ];

    const dashboard = buildCollaboratorOperationalDashboard({
      technicians,
      orders: [
        order({
          technician_id: "tech-001",
          technician: technicians[0],
          technicians: [{ ...technicians[0], is_primary: true }],
        }),
      ],
      laborHistory,
      now: new Date(2026, 5, 28),
    });

    const ana = dashboard.collaborators.find((item) => item.id === "tech-001");
    expect(ana?.hoursMonthMinutes).toBe(120);
    expect(ana?.valueMonthCents).toBe(25000);
    expect(ana?.servicesMonth).toBe(1);
    expect(ana?.history[0]?.source).toBe("Apontamento");
    expect(dashboard.kpis.hoursMonthMinutes).toBe(120);
  });

  it("uses linked service orders as a legacy fallback when labor entries are absent", () => {
    const dashboard = buildCollaboratorOperationalDashboard({
      technicians,
      orders: [
        order({
          id: "order-legacy",
          technician_id: "tech-002",
          technician: technicians[1],
          technicians: [{ ...technicians[1], is_primary: true }],
          worked_minutes: 90,
          hour_rate: 80,
        }),
        order({
          id: "order-running",
          status: "running",
          technician_id: "tech-001",
          technician: technicians[0],
          technicians: [{ ...technicians[0], is_primary: true }],
          worked_minutes: null,
          hour_rate: null,
          finished_at: null,
          closed_at: null,
        }),
      ],
      laborHistory: [],
      now: new Date(2026, 5, 28),
    });

    const bruno = dashboard.collaborators.find((item) => item.id === "tech-002");
    const ana = dashboard.collaborators.find((item) => item.id === "tech-001");

    expect(bruno?.hoursMonthMinutes).toBe(90);
    expect(bruno?.valueMonthCents).toBe(12000);
    expect(bruno?.history[0]?.source).toBe("OS vinculada");
    expect(ana?.status).toBe("Em campo");
  });
});
