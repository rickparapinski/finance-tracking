import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // pixel chrome — no rounded-full, 1px ink border, no shadow (badges are small)
  "inline-flex items-center justify-center border border-ink px-2 py-0.5 text-xs font-sans font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none overflow-hidden",
  {
    variants: {
      variant: {
        // default: ink slab (neutral/label)
        default:
          "bg-ink text-cream-soft border-ink",
        // positive: lime fill
        lime:
          "bg-lime text-ink border-ink",
        // secondary: cream-soft
        secondary:
          "bg-cream-soft text-ink border-ink",
        // warning/over-budget: ink slab — same as default, explicit alias
        warning:
          "bg-ink text-cream-soft border-ink",
        // outline: no fill
        outline:
          "bg-transparent text-ink border-ink",
        // ghost
        ghost:
          "bg-transparent text-ink border-transparent",
        // Kept for shadcn compat — maps to ink slab
        destructive:
          "bg-ink text-cream-soft border-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
