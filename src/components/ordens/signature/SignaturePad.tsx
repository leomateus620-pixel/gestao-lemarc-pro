import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import SignaturePadLib from "signature_pad";

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
};

type Props = {
  onChange?: (empty: boolean) => void;
  className?: string;
};

/**
 * Canvas de assinatura responsivo, com suporte a touch/pen e alta DPR.
 * Exibe linha guia tracejada e fundo branco para legibilidade ao gerar PNG.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { onChange, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useImperativeHandle(ref, () => ({
    clear: () => {
      padRef.current?.clear();
      setIsEmpty(true);
      onChange?.(true);
    },
    isEmpty: () => padRef.current?.isEmpty() ?? true,
    toDataURL: () => padRef.current?.toDataURL("image/png") ?? "",
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: "rgba(255,255,255,0)",
      penColor: "#0b1220",
      minWidth: 0.8,
      maxWidth: 2.6,
      throttle: 8,
      velocityFilterWeight: 0.7,
    });
    padRef.current = pad;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = wrapper.getBoundingClientRect();
      const wasEmpty = pad.isEmpty();
      const data = wasEmpty ? null : pad.toData();
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      ctx?.scale(ratio, ratio);
      pad.clear();
      if (data) pad.fromData(data);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);
    window.addEventListener("orientationchange", resize);

    const handleEnd = () => {
      const empty = pad.isEmpty();
      setIsEmpty(empty);
      onChange?.(empty);
    };
    pad.addEventListener("endStroke", handleEnd);

    return () => {
      pad.removeEventListener("endStroke", handleEnd);
      ro.disconnect();
      window.removeEventListener("orientationchange", resize);
      pad.off();
    };
  }, [onChange]);

  return (
    <div
      ref={wrapperRef}
      className={
        className ??
        "relative h-[42vh] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner"
      }
    >
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
      {/* linha guia */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 bottom-[18%] border-b border-dashed border-slate-300"
      />
      {isEmpty && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          Assine aqui
        </p>
      )}
    </div>
  );
});
