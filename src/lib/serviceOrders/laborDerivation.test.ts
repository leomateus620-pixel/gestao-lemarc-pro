import { describe, expect, it } from "vitest";
import {
  filterMaterializableSessions,
  findMissingSegments,
  isAdminReviewedStatus,
  isSuspiciousSession,
  splitSessionByDay,
  splitSessionsByDay,
} from "./laborDerivation";

describe("splitSessionByDay", () => {
  it("keeps a same-day session as one segment", () => {
    const segs = splitSessionByDay({
      id: "s1",
      technician_id: "t1",
      // 08:00 -> 12:00 local (UTC-3)
      started_at: "2026-08-06T11:00:00.000Z",
      ended_at: "2026-08-06T15:00:00.000Z",
      duration_minutes: 240,
    });
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({
      work_date: "2026-08-06",
      start_time: "08:00:00",
      end_time: "12:00:00",
      duration_minutes: 240,
    });
  });

  it("splits a session that crosses local midnight into one row per day", () => {
    const segs = splitSessionByDay({
      id: "s2",
      technician_id: "t1",
      // 22:00 on 06/08 -> 02:00 on 07/08 local
      started_at: "2026-08-07T01:00:00.000Z",
      ended_at: "2026-08-07T05:00:00.000Z",
      duration_minutes: 240,
    });
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({
      work_date: "2026-08-06",
      start_time: "22:00:00",
      end_time: "23:59:59",
    });
    expect(segs[1]).toMatchObject({
      work_date: "2026-08-07",
      start_time: "00:00:00",
      end_time: "02:00:00",
    });
    expect(segs.reduce((a, s) => a + s.duration_minutes, 0)).toBe(240);
  });

  it("keeps pause/resume across two days as separate day segments", () => {
    const segs = splitSessionsByDay([
      {
        id: "a",
        technician_id: "t1",
        started_at: "2026-08-06T11:00:00.000Z", // 08:00
        ended_at: "2026-08-06T21:00:00.000Z", // 18:00 (pause)
        duration_minutes: 600,
      },
      {
        id: "b",
        technician_id: "t1",
        started_at: "2026-08-07T11:00:00.000Z", // 08:00 next day (resume)
        ended_at: "2026-08-07T15:00:00.000Z", // 12:00
        duration_minutes: 240,
      },
    ]);
    expect(segs.map((s) => s.work_date)).toEqual(["2026-08-06", "2026-08-07"]);
    expect(segs.reduce((a, s) => a + s.duration_minutes, 0)).toBe(840);
  });
});

describe("findMissingSegments", () => {
  it("returns only the day-2 work when day-1 rows already exist", () => {
    const segments = splitSessionsByDay([
      {
        id: "a",
        technician_id: "t1",
        started_at: "2026-08-06T11:00:00.000Z",
        ended_at: "2026-08-06T21:00:00.000Z",
        duration_minutes: 600,
      },
      {
        id: "b",
        technician_id: "t1",
        started_at: "2026-08-07T11:00:00.000Z",
        ended_at: "2026-08-07T15:00:00.000Z",
        duration_minutes: 240,
      },
    ]);
    const missing = findMissingSegments(segments, [
      {
        technician_id: "t1",
        work_date: "2026-08-06",
        start_time: "08:00:00",
        end_time: "18:00:00",
      },
    ]);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toMatchObject({ work_date: "2026-08-07", duration_minutes: 240 });
  });

  it("returns nothing when everything is already materialized", () => {
    const segments = splitSessionsByDay([
      {
        id: "a",
        technician_id: "t1",
        started_at: "2026-08-06T11:00:00.000Z",
        ended_at: "2026-08-06T15:00:00.000Z",
        duration_minutes: 240,
      },
    ]);
    expect(
      findMissingSegments(segments, [
        {
          technician_id: "t1",
          work_date: "2026-08-06",
          start_time: "08:00",
          end_time: "12:00",
        },
      ]),
    ).toHaveLength(0);
  });

  it("does not duplicate a segment that overlaps an admin-adjusted row", () => {
    const segments = splitSessionsByDay([
      {
        id: "overlap",
        technician_id: "t1",
        started_at: "2026-08-06T11:00:00.000Z",
        ended_at: "2026-08-06T15:00:00.000Z",
        duration_minutes: 240,
      },
    ]);
    expect(
      findMissingSegments(segments, [
        {
          technician_id: "t1",
          work_date: "2026-08-06",
          start_time: "08:15",
          end_time: "11:45",
        },
      ]),
    ).toHaveLength(0);
  });
});

describe("suspicious sessions", () => {
  const multiDay = {
    id: "forgotten-open",
    technician_id: "t1",
    started_at: "2026-08-06T19:09:42.000Z",
    ended_at: "2026-08-07T12:41:00.000Z",
    duration_minutes: 1051,
  };

  it("flags a continuous multi-day timer", () => {
    expect(isSuspiciousSession(multiDay)).toBe(true);
  });

  it("never materializes a continuous multi-day timer", () => {
    expect(filterMaterializableSessions([multiDay])).toEqual([]);
  });
});
describe("dois técnicos simultâneos", () => {
  const sessions = [
    {
      id: "s1",
      technician_id: "juan",
      started_at: "2026-08-07T10:54:00.000Z",
      ended_at: "2026-08-07T14:58:00.000Z",
      duration_minutes: 244,
    },
    {
      id: "s2",
      technician_id: "joao",
      started_at: "2026-08-07T10:54:00.000Z",
      ended_at: "2026-08-07T14:58:00.000Z",
      duration_minutes: 244,
    },
  ];

  it("gera um segmento por técnico mesmo com horários idênticos", () => {
    const segments = splitSessionsByDay(sessions);
    expect(segments).toHaveLength(2);
    expect(new Set(segments.map((s) => s.technician_id))).toEqual(new Set(["juan", "joao"]));
  });

  it("aponta o técnico ausente na apuração já materializada", () => {
    const segments = splitSessionsByDay(sessions);
    const missing = findMissingSegments(segments, [
      { technician_id: "juan", work_date: "2026-08-07", start_time: "07:54", end_time: "11:58" },
    ]);
    expect(missing).toHaveLength(1);
    expect(missing[0]!.technician_id).toBe("joao");
  });
});

describe("isAdminReviewedStatus", () => {
  it("não trava a OS apenas finalizada pelo técnico", () => {
    expect(isAdminReviewedStatus("finished")).toBe(false);
    expect(isAdminReviewedStatus("running")).toBe(false);
  });

  it("trava a OS revisada/aprovada/cancelada pelo admin", () => {
    for (const status of ["review", "approved", "cancelled"]) {
      expect(isAdminReviewedStatus(status)).toBe(true);
    }
  });
});

describe("horas do dia seguinte em OS finalizada pelo técnico", () => {
  it("aponta os segmentos ainda ausentes na apuração", () => {
    const segments = splitSessionsByDay([
      {
        id: "d1",
        technician_id: "matheus",
        started_at: "2026-08-19T13:29:00.000Z",
        ended_at: "2026-08-19T15:45:00.000Z",
        duration_minutes: 136,
      },
      {
        id: "d2",
        technician_id: "matheus",
        started_at: "2026-08-20T11:36:00.000Z",
        ended_at: "2026-08-20T15:05:00.000Z",
        duration_minutes: 209,
      },
    ]);
    const missing = findMissingSegments(segments, [
      { technician_id: "matheus", work_date: "2026-08-19", start_time: "10:29", end_time: "12:45" },
    ]);
    expect(missing).toHaveLength(1);
    expect(missing[0]!.work_date).toBe("2026-08-20");
  });
});

describe("pendingLaborMinutes (rede de segurança da apuração)", () => {
  const sp = (d: string, t: string) => `${d}T${t}:00.000-03:00`;

  it("acusa pendência quando o histórico do dia seguinte não foi apurado", () => {
    const sessions = [
      {
        id: "s1",
        technician_id: "t1",
        started_at: sp("2026-08-19", "10:29"),
        ended_at: sp("2026-08-19", "12:45"),
        duration_minutes: 136,
      },
      {
        id: "s2",
        technician_id: "t1",
        started_at: sp("2026-08-20", "08:36"),
        ended_at: sp("2026-08-20", "12:05"),
        duration_minutes: 209,
      },
    ];
    const existing = [
      {
        technician_id: "t1",
        work_date: "2026-08-19",
        start_time: "10:29:00",
        end_time: "12:45:00",
      },
    ];
    expect(pendingLaborMinutes(sessions, existing)).toBe(209);
    expect(pendingLaborMinutes(sessions, [])).toBe(345);
  });

  it("sessões curtas (poucos minutos) também contam como pendência", () => {
    const sessions = [
      {
        id: "s1",
        technician_id: "t1",
        started_at: sp("2026-08-19", "16:28"),
        ended_at: sp("2026-08-19", "16:33"),
        duration_minutes: 5,
      },
    ];
    expect(pendingLaborMinutes(sessions, [])).toBe(5);
  });

  it("sessões suspeitas (>14h ou virando o dia) NÃO geram pendência automática", () => {
    const longSession = [
      {
        id: "s1",
        technician_id: "t1",
        started_at: sp("2026-08-19", "07:00"),
        ended_at: sp("2026-08-19", "23:30"),
        duration_minutes: 990,
      },
    ];
    const overnight = [
      {
        id: "s2",
        technician_id: "t1",
        started_at: sp("2026-08-19", "18:00"),
        ended_at: sp("2026-08-20", "09:00"),
        duration_minutes: 900,
      },
    ];
    expect(pendingLaborMinutes(longSession, [])).toBe(0);
    expect(pendingLaborMinutes(overnight, [])).toBe(0);
  });

  it("apuração completa fica sem pendência (idempotente)", () => {
    const sessions = [
      {
        id: "s1",
        technician_id: "t1",
        started_at: sp("2026-08-19", "08:00"),
        ended_at: sp("2026-08-19", "12:00"),
        duration_minutes: 240,
      },
    ];
    const existing = [
      {
        technician_id: "t1",
        work_date: "2026-08-19",
        start_time: "08:00:00",
        end_time: "12:00:00",
      },
    ];
    expect(pendingLaborMinutes(sessions, existing)).toBe(0);
  });
});
