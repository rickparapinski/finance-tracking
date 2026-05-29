import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // pixel chrome — no border-radius, 2px ink border
        "h-9 w-full min-w-0 px-3 py-1",
        "border-2 border-ink bg-surface text-ink",
        "font-sans text-sm",
        "placeholder:text-ink-soft",
        "outline-none",
        // focus: thick ink outline offset (chunky, not a glow)
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-cream-soft",
        "file:text-ink file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Input }
