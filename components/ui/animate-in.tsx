"use client";

/**
 * AnimateIn — defers slide-up-fade until after React hydration.
 *
 * Problem: static `animate-slide-up` class on SSR'd elements fires during
 * the browser's initial parse (before the user sees the page), so nobody
 * sees the animation.  Adding the class via useEffect fires it *after*
 * hydration, when the page is already visible.
 */

import { CSSProperties, useEffect, useState } from "react";

interface AnimateInProps {
  children: React.ReactNode;
  /** Delay in ms before the animation fires. Default: 0 */
  delay?: number;
  /** Extra classes forwarded to the wrapper div */
  className?: string;
  style?: CSSProperties;
}

export function AnimateIn({
  children,
  delay = 0,
  className = "",
  style,
}: AnimateInProps) {
  const [fired, setFired] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setFired(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  return (
    <div
      // Start invisible; add the animation class once the delay elapses.
      // Both states begin at opacity-0, so there's no visible jump.
      className={`${fired ? "animate-slide-up" : "opacity-0"} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
