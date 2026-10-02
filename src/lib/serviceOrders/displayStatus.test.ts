import { describe, expect, it } from "vitest";
import { getOrderDisplayStatus, summarizeOrderTime, countPausedOrders } from "./displayStatus";
import { computeClosedWorkedMinutesByTech, type TimeSession } from "./timeSessions";

let n = 0;
function s(p: Partial<TimeSession>): TimeSession {
  n++;
  return {
    id: `s${n}`,
    service_order_id: "o1",
    technician_id: "juan",
    kind: "work",
    started_at: "2026-10-02T11:00:00Z",
    ended_at: null,
    duration_minutes: null,
    pause_reason: null,
    pause_notes: null,
    end_reason: null,
    source: "mobile",
    notes: null,
    metadata: null,
    created_by: null,
    created_at: "2026-10-02T11:00:00Z",
    updated_at: "2026-10-02T11:00:00Z",
    ...p,
  };
}
const paused = (tech: string, reason = "almoco", end = "2026-10-02T15:04:00Z") =>
  s({ technician_id: tech, ended_at: end, duration_minutes: 244, end_reason: "pause", pause_reason: reason });

describe("getOrderDisplayStatus", () => {
  it("equipe toda pausada no almoço (#1226) → Pausada · Almoço", () => {
    const d = getOrderDisplayStatus({ status: "running" }, [paused("juan"), paused("omar")]);
    expect(d.key).toBe("paused");
    expect(d.label).toBe("Pausada · Almoço");
    expect(d.pausedCount).toBe(2);
  });

  it("motivos diferentes → só Pausada", () => {
    const d = getOrderDisplayStatus({ status: "running" }, [
      paused("juan"),
      paused("omar", "aguardando_peca"),
    ]);
    expect(d.label).toBe("Pausada");
  });

  it("parcialmente pausada → Em execução com 1 pausado", () => {
    const d = getOrderDisplayStatus({ status: "running" }, [paused("juan"), s({ technician_id: "omar" })]);
    expect(d.key).toBe("running");
    expect(d.pausedCount).toBe(1);
    expect(d.runningCount).toBe(1);
  });

  it("sem sessões → Em execução", () => {
    expect(getOrderDisplayStatus({ status: "running" }, []).key).toBe("running");
    expect(getOrderDisplayStatus({ status: "running" }, null).key).toBe("running");
  });

  it("OS finalizada/aprovada com última sessão em pausa mantém status gravado", () => {
    for (const st of ["finished", "approved", "review"] as const) {
      const d = getOrderDisplayStatus({ status: st }, [paused("juan")]);
      expect(d.key).toBe(st);
    }
  });

  it("pending/dispatched/transit/cancelled não mudam", () => {
    for (const st of ["pending", "dispatched", "transit", "cancelled"] as const) {
      expect(getOrderDisplayStatus({ status: st }, [paused("juan")]).key).toBe(st);
    }
  });

  it("pausa fim_expediente de ontem sem retomar → Pausada", () => {
    const d = getOrderDisplayStatus({ status: "running" }, [
      s({
        technician_id: "juan",
        started_at: "2026-10-01T11:00:00Z",
        ended_at: "2026-10-01T21:00:00Z",
        duration_minutes: 600,
        end_reason: "pause",
        pause_reason: "fim_expediente",
      }),
    ]);
    expect(d.key).toBe("paused");
    expect(d.label).toBe("Pausada · Fim do expediente");
  });

  it("sessão aberta atravessando a meia-noite → Em execução", () => {
    const d = getOrderDisplayStatus({ status: "running" }, [
      s({ technician_id: "juan", started_at: "2026-10-01T22:00:00Z" }),
    ]);
    expect(d.key).toBe("running");
  });

  it("retomar após a pausa → volta para Em execução", () => {
    const d = getOrderDisplayStatus({ status: "running" }, [
      paused("juan"),
      s({ technician_id: "juan", started_at: "2026-10-02T16:00:00Z" }),
    ]);
    expect(d.key).toBe("running");
    expect(d.pausedCount).toBe(0);
  });

  it("todos encerrados com finish sem pausa → Em execução", () => {
    const d = getOrderDisplayStatus({ status: "running" }, [
      s({ ended_at: "2026-10-02T15:00:00Z", duration_minutes: 240, end_reason: "finish" }),
    ]);
    expect(d.key).toBe("running");
  });

  it("ignora sessões sem técnico e de deslocamento", () => {
    const d = getOrderDisplayStatus({ status: "running" }, [
      s({ technician_id: null, ended_at: "2026-10-02T15:00:00Z", end_reason: "pause" }),
      s({ kind: "displacement", ended_at: "2026-10-02T15:00:00Z", end_reason: "pause" }),
    ]);
    expect(d.key).toBe("running");
  });

  it("não altera totais de horas", () => {
    const sessions = [paused("juan"), paused("omar")];
    const before = computeClosedWorkedMinutesByTech(sessions);
    getOrderDisplayStatus({ status: "running" }, sessions);
    summarizeOrderTime(sessions);
    expect(computeClosedWorkedMinutesByTech(sessions)).toEqual(before);
  });

  it("countPausedOrders conta só running pausadas", () => {
    const map = { a: summarizeOrderTime([paused("juan")]), b: summarizeOrderTime([paused("juan")]) };
    expect(
      countPausedOrders(
        [
          { id: "a", status: "running" },
          { id: "b", status: "finished" },
        ],
        map,
      ),
    ).toBe(1);
  });
});
