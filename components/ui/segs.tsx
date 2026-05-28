/**
 * Segs — 8-chunk segmented progress bar.
 * The standard progress indicator for the design system.
 * Never use a smooth bar — always use this.
 */

interface SegsProps {
  /** Number of filled (lime) segments */
  filled: number;
  /** Total number of segments. Default: 8 */
  total?: number;
  /** Dark mode — for use on bg-ink slabs */
  dark?: boolean;
  className?: string;
  /**
   * When true, each filled segment animates in left-to-right
   * using the seg-pop keyframe defined in globals.css.
   */
  animate?: boolean;
  /**
   * Base delay in ms before the first segment fires.
   * Each subsequent segment adds 55 ms.
   * Default: 0
   */
  animateDelay?: number;
}

export function Segs({
  filled,
  total = 8,
  dark = false,
  className = "",
  animate = false,
  animateDelay = 0,
}: SegsProps) {
  return (
    <div className={`flex gap-[3px] ${className}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-2 flex-1 rounded-[2px]"
          style={{
            backgroundColor:
              i < filled
                ? "#C5F03A"
                : dark
                ? "rgba(250,247,236,0.1)"
                : "rgba(31,31,31,0.1)",
            // Only filled segments pop — empty ones render immediately.
            ...(animate && i < filled
              ? {
                  animation: "seg-pop 0.18s ease both",
                  animationDelay: `${animateDelay + i * 55}ms`,
                  transformOrigin: "left center",
                }
              : {}),
          }}
        />
      ))}
    </div>
  );
}
