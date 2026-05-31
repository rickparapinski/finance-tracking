"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ── Constants ───────────────────────────────────────────────────────────────
const CS = 8;   // corner step size (px) — one "pixel" at 8px scale
const TW = 8;   // tail half-width at bubble base (px)
const TH = 14;  // tail total height (px)

function buildPath(w: number, bh: number): string {
  // w  = bubble width
  // bh = bubble body height (excludes tail)
  const s = CS, tw = TW, th = TH;
  const cx = w / 2;

  return [
    `M ${s},0`,
    `H ${w - s}`,
    `L ${w},${s}`,         // top-right stepped corner
    `V ${bh - s}`,
    `L ${w - s},${bh}`,    // bottom-right stepped corner
    `H ${cx + tw}`,
    `L ${cx + tw / 2},${bh + Math.round(th / 2)}`,  // tail right step
    `L ${cx},${bh + th}`,                             // tail tip
    `L ${cx - tw / 2},${bh + Math.round(th / 2)}`,  // tail left step
    `H ${cx - tw}`,
    `L ${s},${bh}`,        // bottom-left stepped corner
    `L 0,${bh - s}`,
    `V ${s}`,
    `Z`,                   // closes top-left corner (0,s) → (s,0)
  ].join(" ");
}

// ── Component ────────────────────────────────────────────────────────────────

interface PixelSpeechBubbleProps {
  children: React.ReactNode;
  className?: string;
}

export function PixelSpeechBubble({ children, className }: PixelSpeechBubbleProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ w: number; bh: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () =>
      setDims({ w: el.offsetWidth, bh: el.offsetHeight - TH });
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const path = dims && dims.w > 0 && dims.bh > 0
    ? buildPath(dims.w, dims.bh)
    : null;

  return (
    <div
      ref={wrapRef}
      className={cn("relative inline-block", className)}
      style={{ paddingBottom: TH }}
    >
      {/* SVG frame — sits behind the content */}
      {path && dims && (
        <svg
          width={dims.w}
          height={dims.bh + TH}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          {/* white fill */}
          <path d={path} fill="#FFFFFF" />

          {/* inner bottom shadow — two grey rects flanking the tail */}
          <rect
            x={CS}
            y={dims.bh - CS}
            width={dims.w / 2 - TW - CS}
            height={CS * 0.75}
            fill="rgba(185,195,215,0.45)"
          />
          <rect
            x={dims.w / 2 + TW}
            y={dims.bh - CS}
            width={dims.w / 2 - TW - CS}
            height={CS * 0.75}
            fill="rgba(185,195,215,0.45)"
          />

          {/* ink border */}
          <path
            d={path}
            fill="none"
            stroke="#1F1F1F"
            strokeWidth="2"
            strokeLinejoin="miter"
          />
        </svg>
      )}

      {/* Content — determines wrapper size */}
      <div
        className="relative font-pixel text-sm text-ink leading-snug px-4 py-3"
        style={{ opacity: dims ? 1 : 0 }}
      >
        {children}
      </div>
    </div>
  );
}
