import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { derivedBadgeTone, getOrderDisplayStatus } from "@/lib/serviceOrders/displayStatus";
import type { TimeSession } from "@/lib/serviceOrders/timeSessions";

/**
 * Regressão: no celular a lista de OS mostrava "EM EXECUÇÃO" para OS em que
 * todos os técnicos já encerraram o tempo (ex.: #1272, #1274). O bloco mobile
 * (lg:hidden) do ServiceOrderIslandRow chamava OrderStatusCluster sem passar
 * `display`, então o selo derivado nunca era usado ali.
 */

const SRC = readFileSync(new URL("./ServiceOrderIslandRow.tsx", import.meta.url), "utf8");

/** Recorta o bloco mobile: do span lg:hidden até começar o bloco desktop. */
function mobileBlock(): string {
  const start = SRC.indexOf('<span className="grid min-w-0 gap-1.5 lg:hidden">');
  const end = SRC.indexOf('<span className="lemarc-order-desktop-summary');
  expect(start, "bloco mobile (lg:hidden) encontrado").toBeGreaterThan(-1);
  expect(end, "bloco desktop encontrado").toBeGreaterThan(start);
  return SRC.slice(start, end);
}

/** Recorta o bloco desktop correspondente. */
function desktopBlock(): string {
  const start = SRC.indexOf('<span className="lemarc-order-desktop-summary');
  expect(start, "bloco desktop encontrado").toBeGreaterThan(-1);
  return SRC.slice(start);
}

/** Atributo `display` passado ao OrderStatusCluster de um bloco. */
function displayAttrIn(block: string): string | null {
  const cluster = block.match(/<OrderStatusCluster\b[\s\S]*?\/>/);
  expect(cluster, "OrderStatusCluster presente no bloco").not.toBeNull();
  const attr = cluster![0].match(/\bdisplay=\{([^}]*)\}/);
  return attr ? attr[1].trim() : null;
}

let n = 0;
function s(p: Partial<TimeSession>): TimeSession {
  n++;
  return {
    id: `m${n}`,
    service_order_id: "o1",
    technician_id: "juan",
    kind: "work",
    started_at: "2026-10-02T08:00:00Z",
    ended_at: null,
    duration_minutes: null,
    pause_reason: null,
    pause_notes: null,
    end_reason: null,
    source: "mobile",
    notes: null,
    metadata: null,
    created_by: null,
    created_at: "2026-10-02T08:00:00Z",
    updated_at: "2026-10-02T08:00:00Z",
    ...p,
  } as TimeSession;
}

describe("ServiceOrderIslandRow bloco mobile", () => {
  it("passa o status derivado ao selo, igual ao desktop", () => {
    expect(displayAttrIn(mobileBlock())).toBe("displayStatus");
    expect(displayAttrIn(desktopBlock())).toBe("displayStatus");
  });

  it("o selo do mobile mostra 'Pausada' quando a equipe toda está pausada", () => {
    const d = getOrderDisplayStatus(
      { status: "running" },
      [
        s({
          technician_id: "juan",
          ended_at: "2026-10-02T12:00:00Z",
          duration_minutes: 240,
          end_reason: "pause",
          pause_reason: "almoco",
        }),
      ],
    );
    expect(d.label).toBe("Pausada · Almoço");
    expect(d.key).toBe("paused");
    // O selo derivado (com o tom próprio) é o que StatusPill escolhe quando
    // `display` é passado; sem ele cairia em statusLabel.running = "Em execução".
    expect(derivedBadgeTone(d)).not.toBeNull();
    expect(getOrderDisplayStatus({ status: "running" }, []).label).toBe("Em execução");
  });

  it("o selo do mobile mostra 'Finalizada pelo técnico' quando todos encerraram", () => {
    const d = getOrderDisplayStatus(
      { status: "running" },
      [s({ ended_at: "2026-10-02T17:00:00Z", duration_minutes: 540, end_reason: "finish" })],
    );
    expect(d.key).toBe("tech_finished");
    expect(d.label).toBe("Finalizada pelo técnico");
    expect(derivedBadgeTone(d)).not.toBeNull();
  });
});
