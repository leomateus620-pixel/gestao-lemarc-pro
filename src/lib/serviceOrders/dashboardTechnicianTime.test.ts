import { describe, expect, it } from "vitest";
import {
  buildDashboardTechnicianTimeSummaries,
  type DashboardLaborEntry,
} from "@/lib/serviceOrders/dashboardTechnicianTime";
import type { TimeSession } from "@/lib/serviceOrders/timeSessions";
import type { AssignedTechnician, ServiceOrder } from "@/types/serviceOrder";

const ana: AssignedTechnician = {
  id: "tech-ana",
  full_name: "Ana Ferreira",
  role: "Técnica",
  is_primary: true,
};

const bruno: AssignedTechnician = {
  id: "tech-bruno",
  full_name: "Bruno Lima",
  role: "Auxiliar",
  is_primary: false,
};

function order(partial: Partial<ServiceOrder> = {}): ServiceOrder {
  return {
    id: "order-1",
    number: 1001,
    title: "Manutenção de prensa",
    description: "Ajuste operacional",
    client_id: "client-1",
    client_unit_id: null,
    technician_id: null,
    service_type: "mecanica",
    service_type_other: null,
    priority: "media",
    status: "running",
    location: null,
    requester_name: null,
    scheduled_for: null,
    opened_at: "2026-07-02T11:00:00.000Z",
    started_at: "2026-07-02T12:00:00.000Z",
    finished_at: null,
    approved_at: null,
    closed_at: null,
    hour_rate: null,
    worked_minutes: null,
    created_by: "user-1",
    created_at: "2026-07-02T11:00:00.000Z",
    updated_at: "2026-07-02T12:00:00.000Z",
    client: { id: "client-1", name: "Metal Norte", unit: null },
    technician: null,
    technicians: [ana],
    client_unit: null,
    ...partial,
  };
}

function session(partial: Partial<TimeSession>): TimeSession {
  return {
    id: "session-1",
    service_order_id: "order-1",
    technician_id: "tech-ana",
    kind: "work",
    started_at: "2026-07-02T12:00:00.000Z",
    ended_at: null,
    duration_minutes: null,
    pause_reason: null,
    pause_notes: null,
    end_reason: null,
    source: "mobile",
    notes: null,
    metadata: null,
    created_by: "user-1",
    created_at: "2026-07-02T12:00:00.000Z",
    updated_at: "2026-07-02T12:00:00.000Z",
    ...partial,
  };
}

function labor(partial: Partial<DashboardLaborEntry>): DashboardLaborEntry {
  return {
    id: "labor-1",
    service_order_id: "order-1",
    technician_id: "tech-ana",
    duration_minutes: 120,
    technician: { id: "tech-ana", full_name: "Ana Ferreira", role: "Técnica" },
    ...partial,
  };
}

describe("buildDashboardTechnicianTimeSummaries", () => {
  it("returns no rows when the OS has no technician or time data", () => {
    const rows = buildDashboardTechnicianTimeSummaries({
      order: order({ technicians: [], technician: null, technician_id: null }),
      data: { sessions: [], laborEntries: [] },
    });

    expect(rows).toHaveLength(0);
  });

  it("uses active time sessions as recorded operating time", () => {
    const rows = buildDashboardTechnicianTimeSummaries({
      order: order(),
      data: {
        sessions: [session({ started_at: "2026-07-02T12:00:00.000Z" })],
        laborEntries: [],
      },
      now: new Date("2026-07-02T13:15:00.000Z"),
    });

    expect(rows[0]).toMatchObject({
      state: "operating",
      source: "service_order_time_sessions",
      accuracy: "recorded",
      minutes: 75,
      activeStartedAt: "2026-07-02T12:00:00.000Z",
    });
  });

  it("shows paused sessions with the pause reason", () => {
    const rows = buildDashboardTechnicianTimeSummaries({
      order: order(),
      data: {
        sessions: [
          session({
            ended_at: "2026-07-02T13:00:00.000Z",
            duration_minutes: 60,
            end_reason: "pause",
            pause_reason: "almoco",
          }),
        ],
        laborEntries: [],
      },
      now: new Date("2026-07-02T13:30:00.000Z"),
    });

    expect(rows[0]).toMatchObject({
      state: "paused",
      minutes: 60,
      pauseLabel: "Almoço",
    });
  });

  it("falls back to labor entries as recorded per-technician finished time", () => {
    const rows = buildDashboardTechnicianTimeSummaries({
      order: order({
        status: "approved",
        technicians: [ana, bruno],
        technician_id: "tech-ana",
      }),
      data: {
        sessions: [],
        laborEntries: [
          labor({ technician_id: "tech-ana", duration_minutes: 120 }),
          labor({
            id: "labor-2",
            technician_id: "tech-bruno",
            duration_minutes: 45,
            technician: { id: "tech-bruno", full_name: "Bruno Lima", role: "Auxiliar" },
          }),
        ],
      },
    });

    expect(rows.map((row) => [row.technicianId, row.minutes, row.state, row.accuracy])).toEqual([
      ["tech-ana", 120, "finished", "recorded"],
      ["tech-bruno", 45, "finished", "recorded"],
    ]);
  });

  it("uses legacy worked_minutes only as estimated single-technician fallback", () => {
    const rows = buildDashboardTechnicianTimeSummaries({
      order: order({
        status: "finished",
        finished_at: "2026-07-02T14:00:00.000Z",
        closed_at: "2026-07-02T14:00:00.000Z",
        worked_minutes: 90,
      }),
      data: { sessions: [], laborEntries: [] },
    });

    expect(rows[0]).toMatchObject({
      source: "service_orders_worked_minutes",
      accuracy: "estimated",
      minutes: 90,
      state: "finished",
    });
  });

  it("marks assigned technicians without entries as waiting on open orders", () => {
    const rows = buildDashboardTechnicianTimeSummaries({
      order: order({ status: "running", worked_minutes: null }),
      data: { sessions: [], laborEntries: [] },
    });

    expect(rows[0]).toMatchObject({
      state: "waiting",
      source: "none",
      minutes: 0,
    });
  });

  it("does not split total OS time across multiple technicians", () => {
    const rows = buildDashboardTechnicianTimeSummaries({
      order: order({
        status: "approved",
        technicians: [ana, bruno],
        worked_minutes: 180,
      }),
      data: { sessions: [], laborEntries: [] },
    });

    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.source === "none" && row.minutes === 0)).toBe(true);
  });
});
