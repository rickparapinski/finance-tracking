"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 → target with an ease-out cubic curve.
 * Re-triggers whenever target changes (useful for filtered subtotals).
 */
export function useCountUp(
  target: number,
  { duration = 700, delay = 0 }: { duration?: number; delay?: number } = {},
): number {
  const [value, setValue] = useState(0);
  const rafRef   = useRef<number | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Reset to 0 whenever the target changes so the animation re-fires.
    setValue(0);

    timerRef.current = setTimeout(() => {
      const start = performance.now();

      const tick = (now: number) => {
        const t      = Math.min((now - start) / duration, 1);
        const eased  = 1 - Math.pow(1 - t, 3); // ease-out cubic
        setValue(target * eased);
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
        else        setValue(target);
      };

      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timerRef.current);
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return value;
}
