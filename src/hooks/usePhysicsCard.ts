import { useCallback, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, PointerEventHandler } from "react";

type PhysicsState = {
  rotateX: number;
  rotateY: number;
  glareX: number;
  glareY: number;
  hover: boolean;
  pressed: boolean;
};

type UsePhysicsCardOptions = {
  disabled?: boolean;
  maxRotate?: number;
  mobileMaxRotate?: number;
  lift?: number;
  perspective?: number;
};

const neutralState: PhysicsState = {
  rotateX: 0,
  rotateY: 0,
  glareX: 50,
  glareY: 50,
  hover: false,
  pressed: false,
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isCoarsePointer<T extends HTMLElement>(event: PointerEvent<T>) {
  return event.pointerType === "touch" || event.pointerType === "pen";
}

export function usePhysicsCard<T extends HTMLElement = HTMLElement>({
  disabled = false,
  maxRotate = 8,
  mobileMaxRotate = 3,
  lift = -3,
  perspective = 1200,
}: UsePhysicsCardOptions = {}) {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState<PhysicsState>(neutralState);

  const onPointerMove = useCallback<PointerEventHandler<T>>(
    (event) => {
      const element = ref.current;
      if (!element || disabled || prefersReducedMotion()) return;

      if (isCoarsePointer(event)) return;

      const rect = element.getBoundingClientRect();
      const pointerX = (event.clientX - rect.left) / rect.width;
      const pointerY = (event.clientY - rect.top) / rect.height;
      const rotate = maxRotate;

      setState((current) => ({
        rotateX: (0.5 - pointerY) * rotate,
        rotateY: (pointerX - 0.5) * rotate,
        glareX: Math.max(0, Math.min(100, pointerX * 100)),
        glareY: Math.max(0, Math.min(100, pointerY * 100)),
        hover: true,
        pressed: current.pressed,
      }));
    },
    [disabled, maxRotate],
  );

  const onPointerEnter = useCallback<PointerEventHandler<T>>(
    (event) => {
      if (disabled || prefersReducedMotion()) return;
      if (isCoarsePointer(event)) return;
      setState((current) => ({ ...current, hover: true }));
    },
    [disabled],
  );

  const onPointerLeave = useCallback<PointerEventHandler<T>>(() => {
    setState(neutralState);
  }, []);

  const onPointerDown = useCallback<PointerEventHandler<T>>(
    (event) => {
      if (disabled || prefersReducedMotion()) return;
      if (isCoarsePointer(event)) {
        setState({ ...neutralState, hover: true, pressed: true });
        return;
      }
      setState((current) => ({ ...current, pressed: true }));
    },
    [disabled],
  );

  const onPointerUp = useCallback<PointerEventHandler<T>>((event) => {
    if (isCoarsePointer(event)) {
      setState(neutralState);
      return;
    }
    setState((current) => ({ ...current, pressed: false }));
  }, []);

  const style = useMemo(
    () =>
      ({
        "--lemarc-card-rx": `${state.rotateX.toFixed(2)}deg`,
        "--lemarc-card-ry": `${state.rotateY.toFixed(2)}deg`,
        "--lemarc-card-mx": `${state.glareX.toFixed(1)}%`,
        "--lemarc-card-my": `${state.glareY.toFixed(1)}%`,
        "--lemarc-card-lift": state.hover ? `${lift}px` : "0px",
        "--lemarc-card-scale": state.pressed ? "0.985" : "1",
        "--lemarc-card-perspective": `${perspective}px`,
      }) as CSSProperties,
    [lift, perspective, state],
  );

  return {
    ref,
    style,
    active: state.hover,
    pressed: state.pressed,
    handlers: {
      onPointerMove,
      onPointerEnter,
      onPointerLeave,
      onPointerDown,
      onPointerUp,
      onPointerCancel: onPointerLeave,
    },
  };
}
