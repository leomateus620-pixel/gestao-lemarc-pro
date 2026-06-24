import { Check, ClipboardCheck, Gauge, Radio } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

import { usePhysicsCard } from "@/hooks/usePhysicsCard";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Dados" },
  { id: 2, label: "Cliente" },
  { id: 3, label: "Técnico" },
  { id: 4, label: "Serviço" },
  { id: 5, label: "Revisão" },
] as const;

const STEP_DURATION_MS = 1050;
const LOOP_PAUSE_MS = 1650;

type ServiceOrderProgressCardProps = {
  className?: string;
};

export function ServiceOrderProgressCard({ className }: ServiceOrderProgressCardProps) {
  const [phase, setPhase] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const physics = usePhysicsCard<HTMLDivElement>({
    disabled: reducedMotion,
    lift: -2,
    maxRotate: 3.5,
    mobileMaxRotate: 1,
    perspective: 1500,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timeouts: number[] = [];

    const clearTimers = () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
      timeouts = [];
    };

    const startCycle = () => {
      clearTimers();
      setPhase(0);

      STEPS.forEach((_, index) => {
        timeouts.push(
          window.setTimeout(
            () => {
              setPhase(index + 1);
            },
            (index + 1) * STEP_DURATION_MS,
          ),
        );
      });

      timeouts.push(window.setTimeout(startCycle, STEPS.length * STEP_DURATION_MS + LOOP_PAUSE_MS));
    };

    const syncMotionPreference = () => {
      clearTimers();
      const shouldReduceMotion = media.matches;
      setReducedMotion(shouldReduceMotion);

      if (shouldReduceMotion) {
        setPhase(STEPS.length);
        return;
      }

      startCycle();
    };

    syncMotionPreference();
    media.addEventListener("change", syncMotionPreference);

    return () => {
      clearTimers();
      media.removeEventListener("change", syncMotionPreference);
    };
  }, []);

  const isComplete = phase >= STEPS.length;
  const currentStepIndex = isComplete ? STEPS.length - 1 : Math.min(phase, STEPS.length - 1);
  const completedCount = isComplete ? STEPS.length : phase;
  const progress = isComplete ? 100 : (completedCount / STEPS.length) * 100;
  const currentStep = STEPS[currentStepIndex];
  const cardStyle = {
    ...physics.style,
    "--lemarc-card-glow": "oklch(0.72 0.19 50 / 0.44)",
  } as CSSProperties;

  return (
    <section
      aria-label="Avanço da criação de uma ordem de serviço"
      className={cn("lemarc-login-os-card lemarc-kinetic-card", className)}
      data-kinetic-active={physics.active ? "true" : "false"}
      ref={physics.ref}
      style={cardStyle}
      {...physics.handlers}
    >
      <div className="lemarc-card-glare" />
      <div aria-hidden="true" className="lemarc-os-grid" />
      <div aria-hidden="true" className="lemarc-os-scan" />

      <div className="hidden md:block">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-orange-glow">
                Fluxo da ordem de serviço
              </p>
              <span className="h-3 w-px bg-white/14" />
              <span className="font-mono text-[0.66rem] font-semibold tracking-[0.12em] text-white/38">
                OS #2487
              </span>
            </div>
            <h2 className="mt-2.5 font-display text-[1.7rem] font-black leading-tight text-white">
              Operação acompanhada, etapa por etapa.
            </h2>
            <p className="mt-2 max-w-[34rem] text-sm leading-6 text-white/58">
              Uma prévia do fluxo que organiza abertura, execução técnica e revisão final.
            </p>
          </div>

          <div className="lemarc-os-icon-orb flex size-14 shrink-0 items-center justify-center rounded-2xl">
            <ClipboardCheck aria-hidden="true" className="size-6" />
          </div>
        </div>

        <div className="lemarc-os-console mt-6 rounded-[1.15rem] p-4 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white/45">
              <Radio aria-hidden="true" className="size-3.5 text-orange-glow" />
              Progresso operacional
            </div>
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-white/64">
              <Gauge aria-hidden="true" className="size-3.5 text-white/38" />
              {Math.round(progress)}%
            </div>
          </div>

          <div className="relative px-1" role="list">
            <div
              aria-hidden="true"
              className="absolute left-[9%] right-[9%] top-[1.15rem] h-[3px] overflow-hidden rounded-full bg-white/[0.08]"
            >
              <div
                className="lemarc-os-progress-fill h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-5 gap-2">
              {STEPS.map((step, index) => {
                const isCompleted = index < completedCount;
                const isActive = !isComplete && index === currentStepIndex;
                const state = isCompleted ? "complete" : isActive ? "active" : "waiting";

                return (
                  <div
                    className="relative flex min-w-0 flex-col items-center text-center"
                    key={step.id}
                    role="listitem"
                  >
                    <div
                      aria-current={isActive ? "step" : undefined}
                      className="lemarc-os-step relative z-10 flex size-9 items-center justify-center rounded-xl text-xs font-black"
                      data-state={state}
                    >
                      {isCompleted ? (
                        <Check aria-hidden="true" className="size-4 stroke-[3]" />
                      ) : (
                        <span>{step.id}</span>
                      )}
                    </div>

                    <span className="mt-2.5 truncate text-[0.72rem] font-bold text-white/88">
                      {step.label}
                    </span>
                    <span className="mt-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-white/34">
                      {isCompleted ? "Concluída" : isActive ? "Em curso" : "A seguir"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-white/[0.09] bg-white/[0.045] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-xl border transition-colors duration-500",
                isComplete
                  ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
                  : "border-orange-glow/20 bg-orange-glow/[0.08] text-orange-glow",
              )}
            >
              {isComplete ? (
                <Check aria-hidden="true" className="size-4 stroke-[3]" />
              ) : (
                <Radio aria-hidden="true" className="size-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {isComplete
                  ? "OS concluída e pronta para entrega"
                  : `Etapa atual: ${currentStep.label}`}
              </p>
              <p className="mt-0.5 truncate text-xs text-white/42">
                {isComplete ? "Histórico atualizado automaticamente" : "Atualização em tempo real"}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.13em]",
              isComplete
                ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
                : "border-orange-glow/20 bg-orange-glow/[0.08] text-orange-glow",
            )}
          >
            {isComplete ? "Finalizada" : `${currentStep.id} de 5`}
          </span>
        </div>
      </div>

      <div className="md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="lemarc-os-icon-orb flex size-9 shrink-0 items-center justify-center rounded-xl">
              <ClipboardCheck aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-orange-glow">
                Ordem de serviço
              </p>
              <h2 className="mt-0.5 truncate font-display text-base font-black text-white">
                Fluxo da OS
              </h2>
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[0.56rem] font-black uppercase tracking-[0.1em]",
              isComplete
                ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
                : "border-white/12 bg-white/[0.055] text-white/55",
            )}
          >
            {isComplete ? "Finalizada" : `${currentStep.id}/5`}
          </span>
        </div>

        <div className="relative mt-3.5 px-1" role="list">
          <div
            aria-hidden="true"
            className="absolute left-[8%] right-[8%] top-3 h-0.5 overflow-hidden rounded-full bg-white/[0.09]"
          >
            <div
              className="lemarc-os-progress-fill h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {STEPS.map((step, index) => {
              const isCompleted = index < completedCount;
              const isActive = !isComplete && index === currentStepIndex;
              const state = isCompleted ? "complete" : isActive ? "active" : "waiting";

              return (
                <div
                  className="relative flex min-w-0 flex-col items-center"
                  key={step.id}
                  role="listitem"
                >
                  <span
                    className="lemarc-os-step relative z-10 flex size-6 items-center justify-center rounded-lg text-[0.58rem] font-black"
                    data-state={state}
                  >
                    {isCompleted ? (
                      <Check aria-hidden="true" className="size-3 stroke-[3]" />
                    ) : (
                      step.id
                    )}
                  </span>
                  <span className="mt-1.5 w-full truncate text-center text-[0.55rem] font-bold text-white/56">
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-2.5">
          <span className="truncate text-[0.68rem] font-semibold text-white/55">
            {isComplete ? "OS concluída" : `Agora: ${currentStep.label}`}
          </span>
          <span className="font-mono text-[0.62rem] font-bold text-orange-glow/85">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      <span aria-live="polite" className="sr-only">
        {isComplete ? "Ordem de serviço concluída" : `Etapa atual: ${currentStep.label}`}
      </span>
    </section>
  );
}
