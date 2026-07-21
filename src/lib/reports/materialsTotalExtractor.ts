import { parseBRLToCents } from "@/lib/serviceOrders/finance";

export type ExtractionResult =
  | { cents: number; reason?: undefined }
  | { cents: null; reason: "not_found" | "parse_error" };

// Regex tolerant to line breaks / multiple spaces between rótulo and número.
// Aceita "Total Líquido", "TOTAL LIQUIDO", com/sem acento.
const LABEL_RE =
  /total\s*l[ií]quido[\s:\-.]*([\d.,]{1,20})/gi;

// pdfjs is browser-only; module is loaded lazily to keep SSR bundles clean.
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function loadPdfjs() {
  if (typeof window === "undefined") throw new Error("pdfjs is browser-only");
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const mod = await import("pdfjs-dist");
      // Configure a worker via URL. Vite bundles the worker chunk.
      try {
        const workerUrl = (
          await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
        ).default;
        mod.GlobalWorkerOptions.workerSrc = workerUrl;
      } catch {
        // If worker URL import fails, fall back to disabling the worker.
        // getDocument still runs on main thread (slower but functional).
      }
      return mod;
    })();
  }
  return pdfjsPromise;
}

/**
 * Extracts the last "Total Líquido" value from a PDF's text layer.
 * Returns cents (integer) or a structured failure reason.
 * Scan-only PDFs (no text layer) resolve to { cents: null, reason: "not_found" }.
 */
export async function extractTotalLiquidoFromPdf(
  bytes: Uint8Array | ArrayBuffer,
): Promise<ExtractionResult> {
  try {
    const pdfjs = await loadPdfjs();
    const data =
      bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    // Clone into a fresh buffer — pdfjs takes ownership and detaches the input.
    const buf = new Uint8Array(data.byteLength);
    buf.set(data);
    const loadingTask = pdfjs.getDocument({ data: buf, useSystemFonts: true });
    const doc = await loadingTask.promise;
    const parts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((it: any) => (typeof it?.str === "string" ? it.str : ""))
        .join(" ");
      parts.push(pageText);
    }
    // Best-effort cleanup; not present on every pdfjs version.
    try {
      await loadingTask.destroy();
    } catch {
      /* noop */
    }
    const fullText = parts.join("\n").replace(/\s+/g, " ");
    const matches = [...fullText.matchAll(LABEL_RE)];
    if (matches.length === 0) return { cents: null, reason: "not_found" };
    // Rodapé de orçamento é o mais confiável: pegar a última ocorrência.
    for (let i = matches.length - 1; i >= 0; i--) {
      const raw = matches[i][1];
      const cents = parseBRLToCents(raw);
      if (cents > 0) return { cents };
    }
    return { cents: null, reason: "not_found" };
  } catch (err) {
    console.warn("Falha ao extrair Total Líquido do PDF:", err);
    return { cents: null, reason: "parse_error" };
  }
}

// Exported for unit tests — same regex, but consumes raw text.
export function findTotalLiquidoInText(text: string): ExtractionResult {
  const flat = text.replace(/\s+/g, " ");
  const matches = [...flat.matchAll(LABEL_RE)];
  if (matches.length === 0) return { cents: null, reason: "not_found" };
  for (let i = matches.length - 1; i >= 0; i--) {
    const cents = parseBRLToCents(matches[i][1]);
    if (cents > 0) return { cents };
  }
  return { cents: null, reason: "not_found" };
}