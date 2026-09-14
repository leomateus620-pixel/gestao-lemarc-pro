import { extractTotalLiquidoFromPdf } from "./materialsTotalExtractor";

export type MaterialSource = { url: string; fileName: string | null };

export type MaterialItem = {
  fileName: string | null;
  cents: number | null;
  reason?: "not_found" | "parse_error" | "fetch_error" | "not_pdf";
};

export type MaterialsTotals = {
  items: MaterialItem[];
  /** Sum of every value read. Null when there are attachments but none could be read. */
  totalCents: number | null;
  failedCount: number;
  /** Bytes already downloaded, keyed by url — reused for PDF merging. */
  bytes: Map<string, ArrayBuffer>;
};

function isPdfBytes(buf: ArrayBuffer): boolean {
  const head = new Uint8Array(buf.slice(0, 5));
  return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
}

/**
 * Reads the "Total Líquido" of EVERY attached material PDF and sums them.
 * A single unreadable file does not invalidate the others — its value is
 * reported as null and the sum keeps the values that could be read.
 */
export async function collectMaterialsTotals(
  sources: MaterialSource[],
): Promise<MaterialsTotals> {
  const items: MaterialItem[] = [];
  const bytes = new Map<string, ArrayBuffer>();
  let sum = 0;
  let read = 0;
  let failedCount = 0;

  for (const src of sources) {
    let item: MaterialItem = { fileName: src.fileName, cents: null, reason: "fetch_error" };
    try {
      const res = await fetch(src.url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (isPdfBytes(buf)) {
          bytes.set(src.url, buf);
          const result = await extractTotalLiquidoFromPdf(new Uint8Array(buf));
          item =
            result.cents != null
              ? { fileName: src.fileName, cents: result.cents }
              : { fileName: src.fileName, cents: null, reason: result.reason };
        } else {
          item = { fileName: src.fileName, cents: null, reason: "not_pdf" };
        }
      }
    } catch (err) {
      console.warn("Falha ao ler PDF de materiais:", src.fileName, err);
    }
    if (item.cents != null) {
      sum += item.cents;
      read += 1;
    } else {
      failedCount += 1;
    }
    items.push(item);
  }

  return {
    items,
    totalCents: sources.length === 0 ? null : read > 0 ? sum : null,
    failedCount,
    bytes,
  };
}

/** Pure helper (unit-testable): sums the values that were read. */
export function sumMaterialItems(items: MaterialItem[]): number | null {
  const read = items.filter((i) => i.cents != null);
  if (items.length === 0 || read.length === 0) return null;
  return read.reduce((acc, i) => acc + (i.cents ?? 0), 0);
}
