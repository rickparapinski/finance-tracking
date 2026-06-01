/**
 * Segs — 8-chunk segmented progress bar.
 * Filled segments: lime, inset pixel block (1px inner shadow).
 * Empty segments: cream-soft with thin ink border.
 * Animation uses steps() — sprite-style, not smooth ease.
 */

interface SegsProps {
  filled: number
  total?: number
  /** Dark mode — for use on bg-ink slabs */
  dark?: boolean
  className?: string
  animate?: boolean
  animateDelay?: number
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
      {Array.from({ length: total }).map((_, i) => {
        const isFilled = i < filled
        return (
          <div
            key={i}
            style={{
              height: "10px",
              flex: "1",
              // pixel block treatment: 1px ink border, no radius
              border: isFilled
                ? "1px solid #1A1A1A"
                : dark
                ? "1px solid rgba(250,247,236,0.2)"
                : "1px solid rgba(31,31,31,0.25)",
              backgroundColor: isFilled
                ? "#C5F03A"
                : dark
                ? "rgba(250,247,236,0.07)"
                : "rgba(250,247,236,0.9)",
              // inset shadow on filled = embossed pixel look
              boxShadow: isFilled
                ? "inset 1px 1px 0 rgba(255,255,255,0.4), inset -1px -1px 0 rgba(0,0,0,0.15)"
                : "none",
              borderRadius: 0,
              // steps() animation — sprite-style pop, not smooth ease
              ...(animate && isFilled
                ? {
                    animation: `seg-pop 0.12s steps(3) both`,
                    animationDelay: `${animateDelay + i * 55}ms`,
                    transformOrigin: "left center",
                  }
                : {}),
            }}
          />
        )
      })}
    </div>
  )
}
