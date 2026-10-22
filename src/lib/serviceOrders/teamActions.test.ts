import { describe, expect, it } from "vitest";
import {
  appendNewDraftEntries,
  assertExplicitScope,
  legacyFallbackTechnicianIds,
  linkDialogOptions,
  teamRowActions,
  teamStartableIds,
  teamStateLabel,
} from "./teamActions";
import { findMissingSegments, splitSessionsByDay, type SessionLike } from "./laborDerivation";
import { computeTotals, enrichEntry } from "./finance";
import { getTechnicianState, type TimeSession } from "./timeSessions";

// America/Sao_Paulo = UTC-3 (sem horário de verão em 2026).
const sp = (day: string, hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCHours(h + 3, m, 0, 0);
  return d.toISOString();
};
const D1 = "2026-10-01";
const D2 = "2026-10-02";
let seq = 0;
const work = (
  tech: string,
  day: string,
  a: string,
  b: string | null,
  end_reason: TimeSession["end_reason"] = "pause",
): TimeSession =>
  ({
    id: `s${++seq}`,
    service_order_id: "os",
    technician_id: tech,
    kind: "work",
    started_at: sp(day, a),
    ended_at: b ? sp(day, b) : null,
    duration_minutes: b
      ? (new Date(sp(day, b)).getTime() - new Date(sp(day, a)).getTime()) / 60000
      : null,
    pause_reason: null,
    pause_notes: null,
    end_reason: b ? end_reason : null,
    source: "desktop",
    notes: null,
    metadata: null,
    created_by: null,
    created_at: sp(day, a),
    updated_at: sp(day, a),
    adjusted_by: null,
    adjusted_at: null,
    adjustment_reason: null,
    technician_reviewed_at: null,
    technician_reviewed_by: null,
    technician_review_note: null,
  }) as TimeSession;

const RATES: Record<string, number> = { A: 10000, B: 12000, C: 9000, D: 11000 };

function abSessions() {
  return ["A", "B"].flatMap((t) => [
    work(t, D1, "08:00", "12:00"),
    work(t, D1, "13:00", "17:00"),
    work(t, D2, "08:00", "10:00", "finish"),
  ]);
}
function cdSessions() {
  return ["C", "D"].flatMap((t) => [
    work(t, D2, "10:00", "12:00"),
    work(t, D2, "13:00", "17:00", "finish"),
  ]);
}
function toEntries(segs: ReturnType<typeof splitSessionsByDay>) {
  return segs.map((s) =>
    enrichEntry({
      technician_id: s.technician_id!,
      role: null,
      work_date: s.work_date,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
      hourly_rate_cents: RATES[s.technician_id!],
      description: null,
    }),
  );
}

describe("fixture A/B/C/D — equipe adicionada no dia 2", () => {
  it("apura A R$1.000, B R$1.200, C R$540, D R$660; total 32h / 1.920 min / R$3.400", () => {
    const ab = abSessions();
    // A/B já materializados antes de C e D entrarem.
    const abEntries = toEntries(splitSessionsByDay(ab as SessionLike[]));
    const abSnapshot = JSON.parse(JSON.stringify(abEntries));

    const all = [...ab, ...cdSessions()];
    const missing = findMissingSegments(splitSessionsByDay(all as SessionLike[]), abEntries);
    // Só os períodos novos de C e D entram, uma única vez.
    expect(new Set(missing.map((m) => m.technician_id))).toEqual(new Set(["C", "D"]));
    expect(missing).toHaveLength(4);

    const entries = [...abEntries, ...toEntries(missing)];
    // A adição não altera os lançamentos anteriores.
    expect(entries.slice(0, abEntries.length)).toEqual(abSnapshot);

    const byTech = (t: string) =>
      entries.filter((e) => e.technician_id === t).reduce((a, e) => a + e.subtotal_cents, 0);
    expect(byTech("A")).toBe(100000);
    expect(byTech("B")).toBe(120000);
    expect(byTech("C")).toBe(54000);
    expect(byTech("D")).toBe(66000);

    const totals = computeTotals(
      entries,
      { type: "none", count: 0, km_total: 0, rate_cents: 0, notes: null } as never,
      0,
    );
    expect(totals.totalLaborMinutes).toBe(1920);
    expect(totals.totalLaborMinutes / 60).toBe(32);
    expect(totals.totalLaborCents).toBe(340000);

    // Reconciliar de novo não duplica nada.
    expect(findMissingSegments(splitSessionsByDay(all as SessionLike[]), entries)).toHaveLength(0);
  });

  it("vinculado às 09h e iniciado às 10h15 conta a partir de 10h15", () => {
    const s = [work("C", D2, "10:15", "12:00", "finish")];
    const segs = splitSessionsByDay(s as SessionLike[]);
    expect(segs[0].start_time.slice(0, 5)).toBe("10:15");
    expect(segs[0].duration_minutes).toBe(105);
  });

  it("C às 10h15 e D às 11h contam cada um da própria abertura", () => {
    const segs = splitSessionsByDay([
      work("C", D2, "10:15", "12:00", "finish"),
      work("D", D2, "11:00", "12:00", "finish"),
    ] as SessionLike[]);
    expect(segs.find((x) => x.technician_id === "C")!.duration_minutes).toBe(105);
    expect(segs.find((x) => x.technician_id === "D")!.duration_minutes).toBe(60);
  });

  it("vínculo sem início = zero horas e sem linha presumida", () => {
    const sessions = abSessions();
    expect(getTechnicianState(sessions, "C").state).toBe("idle");
    expect(legacyFallbackTechnicianIds(sessions, ["A", "B", "C"])).toEqual([]);
    expect(
      splitSessionsByDay(sessions as SessionLike[]).filter((s) => s.technician_id === "C"),
    ).toHaveLength(0);
  });

  it("OS legada sem nenhuma sessão mantém o fallback para todos", () => {
    expect(legacyFallbackTechnicianIds([], ["A", "B"])).toEqual(["A", "B"]);
  });

  it("A trabalhando quando C entra: A continua ativo", () => {
    const sessions = [work("A", D2, "08:00", null)];
    expect(getTechnicianState(sessions, "A").state).toBe("running");
    expect(getTechnicianState(sessions, "C").state).toBe("idle");
  });

  it("pausa e retomada criam intervalos separados; pausa não conta", () => {
    const segs = splitSessionsByDay(
      cdSessions().filter((s) => s.technician_id === "C") as SessionLike[],
    );
    expect(segs.reduce((a, s) => a + s.duration_minutes, 0)).toBe(360);
  });
});

describe("ações da equipe", () => {
  it("'Iniciar para a equipe' não reinicia quem encerrou nem quem está pausado", () => {
    expect(
      teamStartableIds([
        { id: "A", state: "finished" },
        { id: "B", state: "paused" },
        { id: "C", state: "idle" },
        { id: "D", state: "running" },
      ]),
    ).toEqual(["C"]);
  });

  it("quem não é da OS não age; técnico da OS e admin agem em qualquer linha", () => {
    expect(
      teamRowActions({ state: "idle", orderStatus: "running", isAdmin: false, isOwnRow: false }),
    ).toEqual([]);
    const colleague = (state: "idle" | "running" | "paused" | "finished") =>
      teamRowActions({
        state,
        orderStatus: "running",
        isAdmin: false,
        isOwnRow: false,
        isOrderTechnician: true,
      });
    expect(colleague("idle")).toEqual(["start"]);
    expect(colleague("running")).toEqual(["pause", "finish"]);
    expect(colleague("paused")).toEqual(["resume", "finish"]);
    expect(colleague("finished")).toEqual(["restart"]);
    expect(
      teamRowActions({
        state: "running",
        orderStatus: "finished",
        isAdmin: false,
        isOwnRow: false,
        isOrderTechnician: true,
      }),
    ).toEqual([]);
    expect(
      teamRowActions({ state: "idle", orderStatus: "running", isAdmin: false, isOwnRow: true }),
    ).toEqual(["start"]);
    expect(
      teamRowActions({ state: "running", orderStatus: "running", isAdmin: true, isOwnRow: false }),
    ).toEqual(["pause", "finish"]);
    expect(
      teamRowActions({ state: "paused", orderStatus: "running", isAdmin: true, isOwnRow: false }),
    ).toEqual(["resume", "finish"]);
  });

  it("mesmo técnico pode voltar depois de encerrar (ação deliberada)", () => {
    expect(
      teamRowActions({ state: "finished", orderStatus: "running", isAdmin: false, isOwnRow: true }),
    ).toEqual(["restart"]);
    expect(
      teamRowActions({ state: "finished", orderStatus: "running", isAdmin: true, isOwnRow: false }),
    ).toEqual(["restart"]);
  });

  it("sem cronômetro fora de execução ou em OS encerrada", () => {
    for (const status of [
      "pending",
      "dispatched",
      "transit",
      "finished",
      "review",
      "approved",
      "cancelled",
    ] as const) {
      expect(
        teamRowActions({ state: "idle", orderStatus: status, isAdmin: true, isOwnRow: true }),
      ).toEqual([]);
    }
  });

  it("diálogo: iniciar só em execução; vincular até aprovada; nada em cancelada", () => {
    expect(linkDialogOptions("running")).toEqual({ canLink: true, canStart: true });
    expect(linkDialogOptions("pending")).toEqual({ canLink: true, canStart: false });
    expect(linkDialogOptions("approved")).toEqual({ canLink: true, canStart: false });
    expect(linkDialogOptions("cancelled")).toEqual({ canLink: false, canStart: false });
  });

  it("seleção vazia é rejeitada antes de qualquer escrita", () => {
    expect(() => assertExplicitScope([])).toThrow();
    expect(() => assertExplicitScope(null)).toThrow();
    expect(assertExplicitScope(["C", "C", "D"])).toEqual(["C", "D"]);
  });

  it("rótulos de estado", () => {
    expect(teamStateLabel("idle")).toBe("Aguardando início");
    expect(teamStateLabel("paused")).toBe("Em pausa");
  });
});

describe("rascunho da apuração aberto antes do fim dos novos tempos", () => {
  it("acrescenta só os novos períodos, preservando linhas editadas pelo admin", () => {
    const existing = [
      { technician_id: "A", work_date: D2, start_time: "08:00", end_time: "09:30", edited: true },
    ];
    const incoming = [
      { technician_id: "A", work_date: D2, start_time: "08:00", end_time: "10:00", edited: false },
      { technician_id: "C", work_date: D2, start_time: "10:00", end_time: "12:00", edited: false },
    ];
    const out = appendNewDraftEntries(existing, incoming);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe(existing[0]);
    expect(out[1].technician_id).toBe("C");
    expect(appendNewDraftEntries(out, incoming)).toHaveLength(2);
  });
});
