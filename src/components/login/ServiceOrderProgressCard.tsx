import { CheckCircle2, ClipboardCheck } from "lucide-react";
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

const STEP_DURATION_MS = 1000;
const LOOP_PAUSE_MS = 900;

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
  const currentStepIndex = isComplete ? STEPS.length - 1 : phase;
  const completedCount = isComplete ? STEPS.length : phase;
  const progress = isComplete ? 100 : (currentStepIndex / Math.max(STEPS.length - 1, 1)) * 100;
  const currentStep = STEPS[currentStepIndex];
  const cardStyle = {
    ...physics.style,
    "--lemarc-card-glow": "oklch(0.72 0.19 50 / 0.44)",
  } as CSSProperties;

  return (
    <section
      aria-label="Avanço da criação de uma ordem de serviço"
      className={cn("lemarc-login-os-card lemarc-kinetic-card hidden md:block", className)}
      data-kinetic-active={physics.active ? "true" : "false"}
      ref={physics.ref}
      style={cardStyle}
      {...physics.handlers}
    >
      <div className="lemarc-card-glare" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-glow">
            Ordem de serviço
          </p>
          <h2 className="mt-2 font-display text-2xl font-black leading-tight text-white">
            Fluxo da Ordem de Serviço
          </h2>
          <p className="mt-2 max-w-[32rem] text-sm leading-6 text-white/66">
            Da abertura à revisão final em um fluxo operacional claro.
          </p>
        </div>

        <div className="hidden size-12 shrink-0 items-center justify-center rounded-2xl border border-orange-glow/25 bg-orange-glow/12 text-orange-glow shadow-[0_18px_34px_-24px_oklch(0.72_0.19_50/0.9)] lg:flex">
          <ClipboardCheck aria-hidden="true" className="size-5" />
        </div>
      </div>

      <div className="relative mt-8 px-1" role="list">
        <div
          aria-hidden="true"
          className="absolute left-[10%] right-[10%] top-6 h-1 rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,oklch(0.78_0.18_55),oklch(0.93_0.14_72))] shadow-[0_0_22px_oklch(0.72_0.19_50/0.55)] transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-5 gap-2">
          {STEPS.map((step, index) => {
            const isCompleted = index < completedCount;
            const isActive = !isComplete && index === currentStepIndex;

            return (
              <div
                className="relative flex min-w-0 flex-col items-center text-center"
                key={step.id}
                role="listitem"
              >
                {isCompleted ? (
                  <span
                    aria-hidden="true"
                    className="absolute -top-5 text-sm leading-none drop-shadow-[0_4px_10px_oklch(0_0_0/0.45)]"
                  >
                    ✅
                  </span>
                ) : null}

                <div
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "relative z-10 flex size-12 items-center justify-center rounded-2xl border text-sm font-black transition-all duration-500 motion-reduce:transition-none",
                    isCompleted
                      ? "border-orange-glow/45 bg-orange-glow text-navy-deep shadow-[0_14px_28px_-20px_oklch(0.72_0.19_50/0.9)]"
                      : "border-white/13 bg-white/[0.07] text-white/64",
                    isActive &&
                      "scale-105 border-orange-glow/65 bg-orange-glow/18 text-orange-glow shadow-[0_0_0_5px_oklch(0.72_0.19_50/0.08),0_18px_34px_-22px_oklch(0.72_0.19_50/0.95)]",
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 aria-hidden="true" className="size-5" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                <span className="mt-3 truncate text-[0.72rem] font-bold text-white">
                  {step.label}
                </span>
                <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-white/45">
                  {isCompleted ? "Concluído" : isActive ? "Atual" : "Fila"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        aria-live="polite"
        className="mt-7 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-semibold text-white/74"
      >
        <span>{isComplete ? "OS concluída" : `Etapa atual: ${currentStep.label}`}</span>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em]",
            isComplete
              ? "border-orange-glow/35 bg-orange-glow/16 text-orange-glow"
              : "border-white/12 bg-white/[0.06] text-white/58",
          )}
        >
          {isComplete ? "Finalizada" : `${currentStep.id}/5`}
        </span>
      </div>
    </section>
  );
}
