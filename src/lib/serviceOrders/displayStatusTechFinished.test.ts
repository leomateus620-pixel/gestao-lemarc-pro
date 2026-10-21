import { describe, expect, it } from "vitest";
import {
  countPausedOrders,
  countTechFinishedOrders,
  getOrderDisplayStatus,
  inFieldDetail,
  summarizeOrderTime,
} from "./displayStatus";
import type { TimeSession } from "./timeSessions";

let n = 0;
function s(p: Partial<TimeSession>): TimeSession {
  n++;
  return {
    id: `t${n}`, service_order_id: "o1", technician_id: "juan", kind: "work",
    started_at: `2026-10-02T${String(8 + n).padStart(2, "0")}:00:00Z`,
    ended_at: null, duration_minutes: null, pause_reason: null, pause_notes: null,
    end_reason: null, source: "mobile", notes: null, metadata: null, created_by: null,
    created_at: "2026-10-02T08:00:00Z", updated_at: "2026-10-02T08:00:00Z", ...p,
  } as TimeSession;
}
const run = (tech: string, at: string) => s({ technician_id: tech, started_at: at });
const pause = (tech: string, at: string, end: string) =>
  s({ technician_id: tech, started_at: at, ended_at: end, end_reason: "pause", pause_reason: "almoco" });
const fin = (tech: string, at: string, end: string) =>
  s({ technician_id: tech, started_at: at, ended_at: end, end_reason: "finish" });
const key = (sessions: TimeSession[]) => getOrderDisplayStatus({ status: "running" }, sessions).key;

describe("Finalizada pelo técnico", () => {
  it("ciclo: em andamento → pausada → retomada → encerrada → reaberta", () => {
    expect(key([run("a", "2026-10-02T08:00:00Z")])).toBe("running");
    const p = pause("a", "2026-10-02T08:00:00Z", "2026-10-02T12:00:00Z");
    expect(key([p])).toBe("paused");
    expect(key([p, run("a", "2026-10-02T13:00:00Z")])).toBe("running");
    const f = fin("a", "2026-10-02T13:00:00Z", "2026-10-02T17:00:00Z");
    expect(key([p, f])).toBe("tech_finished");
    expect(key([p, f, run("a", "2026-10-02T18:00:00Z")])).toBe("running");
    expect(key([p, f, pause("a", "2026-10-02T18:00:00Z", "2026-10-02T19:00:00Z")])).toBe("paused");
  });

  it("encerrado + pausado → Pausada (#1266)", () => {
    expect(key([fin("a", "2026-10-02T08:00:00Z", "2026-10-02T10:00:00Z"), pause("b", "2026-10-02T08:00:00Z", "2026-10-02T10:00:00Z")])).toBe("paused");
  });

  it("encerrado + em andamento → Em execução (#1267)", () => {
    expect(key([fin("a", "2026-10-02T08:00:00Z", "2026-10-02T10:00:00Z"), run("b", "2026-10-02T08:00:00Z")])).toBe("running");
  });

  it("encerrado + vinculado que nunca iniciou → Finalizada pelo técnico", () => {
    // O vinculado sem sessão não aparece nas sessões e não impede.
    expect(key([fin("a", "2026-10-02T08:00:00Z", "2026-10-02T10:00:00Z")])).toBe("tech_finished");
  });

  it("OS sem sessões → Em execução", () => {
    expect(key([])).toBe("running");
  });

  it("OS não-running fica inalterada", () => {
    const sessions = [fin("a", "2026-10-02T08:00:00Z", "2026-10-02T10:00:00Z")];
    for (const st of ["finished", "review", "approved", "pending"] as const) {
      expect(getOrderDisplayStatus({ status: st }, sessions).key).toBe(st);
    }
  });

  it("contadores separam pausadas e finalizadas pelo técnico", () => {
    const map = {
      a: summarizeOrderTime([fin("a", "2026-10-02T08:00:00Z", "2026-10-02T10:00:00Z")]),
      b: summarizeOrderTime([pause("a", "2026-10-02T08:00:00Z", "2026-10-02T10:00:00Z")]),
      c: summarizeOrderTime([fin("a", "2026-10-02T08:00:00Z", "2026-10-02T10:00:00Z")]),
    };
    const orders = [
      { id: "a", status: "running" as const },
      { id: "b", status: "running" as const },
      { id: "c", status: "finished" as const },
    ];
    expect(countTechFinishedOrders(orders, map)).toBe(1);
    expect(countPausedOrders(orders, map)).toBe(1);
    expect(inFieldDetail(5, 1, 1)).toBe("3 em execução · 1 pausada · 1 finalizada pelo técnico");
    expect(inFieldDetail(5, 0, 0)).toBeUndefined();
  });
});
