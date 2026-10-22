import { describe, expect, it } from "vitest";
import { assertTeamOrderRunning, resumeTeamSelection, validateTeamScope } from "./teamScope";
import { summarizeOrderTime, displayFromSummary } from "./displayStatus";
import type { TimeSession } from "./timeSessions";

const base = { assigned: ["M", "J"], activeIds: ["M", "J"], requireExplicit: true };

describe("alvos das ações de tempo da equipe", () => {
  it("seleção vazia é rejeitada", () => {
    expect(() => validateTeamScope({ ...base, requested: [] })).toThrow("Selecione");
  });
  it("modo legado sem seleção usa a equipe vinculada", () => {
    expect(validateTeamScope({ ...base, requireExplicit: false, requested: [] })).toEqual(["M", "J"]);
  });
  it("técnico não vinculado é rejeitado", () => {
    expect(() => validateTeamScope({ ...base, requested: ["X"] })).toThrow("não vinculado");
  });
  it("técnico inativo é rejeitado", () => {
    expect(() => validateTeamScope({ ...base, activeIds: ["M"], requested: ["J"] })).toThrow(
      "inativo",
    );
  });
  it("técnico da OS pode mirar um colega (seleção parcial)", () => {
    expect(validateTeamScope({ ...base, requested: ["J", "J"] })).toEqual(["J"]);
  });
  it("só com a OS em execução", () => {
    expect(() => assertTeamOrderRunning("finished")).toThrow();
    expect(() => assertTeamOrderRunning("running")).not.toThrow();
  });
});

describe("Voltar a trabalhar com a equipe", () => {
  const states = [
    { id: "M", state: "finished" as const },
    { id: "J", state: "finished" as const },
    { id: "P", state: "paused" as const },
    { id: "R", state: "running" as const },
    { id: "I", state: "idle" as const },
  ];
  it("seleção parcial: desmarcados ficam de fora", () => {
    expect(resumeTeamSelection(states, ["J", "P"])).toEqual({ resumeIds: ["P"], restartIds: ["J"] });
  });
  it("em andamento e nunca iniciado nunca entram", () => {
    expect(resumeTeamSelection(states, ["R", "I"])).toEqual({ resumeIds: [], restartIds: [] });
  });
});

describe("selos após ações sobre colega (OS #1267)", () => {
  let n = 0;
  const s = (tech: string, a: string, b: string | null, end: "pause" | "finish" | null) =>
    ({
      id: `x${++n}`,
      service_order_id: "os",
      technician_id: tech,
      kind: "work",
      started_at: a,
      ended_at: b,
      end_reason: end,
    }) as unknown as TimeSession;
  const label = (ss: TimeSession[]) => displayFromSummary("running", summarizeOrderTime(ss)).label;
  const t = (h: number) => `2026-10-22T${String(h).padStart(2, "0")}:00:00.000Z`;

  it("encerrados → Finalizada pelo técnico; volta → Em execução; pausa → Pausada", () => {
    const done = [s("M", t(10), t(11), "finish"), s("J", t(10), t(11), "finish")];
    expect(label(done)).toBe("Finalizada pelo técnico");
    const back = [...done, s("J", t(12), null, null)];
    expect(label(back)).toBe("Em execução");
    const paused = [...done, s("J", t(12), t(13), "pause")];
    expect(label(paused)).toBe("Pausada");
    const ended = [...done, s("J", t(12), t(13), "finish")];
    expect(label(ended)).toBe("Finalizada pelo técnico");
  });
});
