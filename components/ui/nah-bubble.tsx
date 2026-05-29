"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Nah } from "@/components/Nah"

/**
 * NahBubble — RPG-style pixel speech bubble with Nah mascot.
 *
 * Usage:
 *   <NahBubble expression="skeptical">you sure?</NahBubble>
 *   <NahBubble expression="disappointed" side="left">knew it.</NahBubble>
 *
 * The bubble tail points toward Nah. By default Nah is on the left,
 * tail points left. Use side="right" to flip.
 */

interface NahBubbleProps {
  children: React.ReactNode
  expression?: "default" | "skeptical" | "disappointed" | "approving" | "hyped"
  /** Which side Nah appears on. Tail always points toward Nah. */
  side?: "left" | "right"
  className?: string
  /** Size of the Nah sprite in pixels */
  nahSize?: number
}

export function NahBubble({
  children,
  expression = "default",
  side = "left",
  className,
  nahSize = 48,
}: NahBubbleProps) {
  const isLeft = side === "left"

  return (
    <div
      className={cn(
        "inline-flex items-end gap-3",
        isLeft ? "flex-row" : "flex-row-reverse",
        className
      )}
    >
      {/* Mascot */}
      <div className="shrink-0 self-end">
        <Nah expression={expression} size={nahSize} />
      </div>

      {/* Bubble */}
      <div className="relative">
        {/* Main bubble box — pixel-box treatment */}
        <div
          className={cn(
            "relative bg-surface border-2 border-ink shadow-[4px_4px_0_#1F1F1F]",
            "px-4 py-3 font-pixel text-sm text-ink leading-snug max-w-[220px]"
          )}
        >
          {children}
        </div>

        {/* Tail — pixel triangle pointing toward Nah */}
        {/* Rendered as a stacked pair of pseudo-divs for crisp pixel edge */}
        <div
          aria-hidden
          className={cn(
            "absolute bottom-3",
            isLeft ? "-left-[10px]" : "-right-[10px]"
          )}
          style={{
            width: 0,
            height: 0,
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            ...(isLeft
              ? {
                  borderRight: "8px solid #1F1F1F",
                }
              : {
                  borderLeft: "8px solid #1F1F1F",
                }),
          }}
        />
        {/* Inner tail (surface color) */}
        <div
          aria-hidden
          className={cn(
            "absolute bottom-3",
            isLeft ? "-left-[7px]" : "-right-[7px]"
          )}
          style={{
            width: 0,
            height: 0,
            borderTop: "5px solid transparent",
            borderBottom: "5px solid transparent",
            ...(isLeft
              ? {
                  borderRight: "7px solid #FFFFFF",
                }
              : {
                  borderLeft: "7px solid #FFFFFF",
                }),
          }}
        />
      </div>
    </div>
  )
}
