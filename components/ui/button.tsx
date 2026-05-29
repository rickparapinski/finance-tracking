import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base: pixel chrome — no border-radius, hard offset shadow, steps press
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-sans font-medium select-none cursor-pointer",
    "border-2 border-ink",
    "shadow-[4px_4px_0_#1F1F1F]",
    "transition-none", // no smooth transitions — pixel feel
    // hover: lime fill
    "hover:bg-lime hover:text-ink",
    // active/pressed: translate into shadow, shadow shrinks
    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F]",
    // disabled
    "disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none",
    // focus: chunky stepped outline, no soft glow
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
    // svg sizing
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        // Default: white surface, ink border, ink text, offset shadow
        default:
          "bg-surface text-ink",
        // Primary: ink slab (high contrast — use for primary actions)
        primary:
          "bg-ink text-cream-soft border-ink shadow-[4px_4px_0_#5A5A5A] hover:bg-lime hover:text-ink hover:border-ink hover:shadow-[4px_4px_0_#1F1F1F]",
        // Lime: filled lime (for positive/confirm actions)
        lime:
          "bg-lime text-ink border-ink",
        // Ghost: no fill, no shadow — for tertiary/nav actions
        ghost:
          "bg-transparent text-ink border-transparent shadow-none hover:bg-lime hover:border-ink hover:shadow-[4px_4px_0_#1F1F1F] active:shadow-[2px_2px_0_#1F1F1F]",
        // Outline: same as default (explicit alias)
        outline:
          "bg-surface text-ink",
        // Destructive: ink slab (never red — charcoal slab is the warning)
        destructive:
          "bg-ink text-cream-soft border-ink shadow-[4px_4px_0_#5A5A5A] hover:bg-lime hover:text-ink hover:border-ink",
        // Link: plain text, no box
        link: "border-transparent shadow-none bg-transparent text-ink underline-offset-4 hover:underline hover:bg-transparent hover:shadow-none active:translate-x-0 active:translate-y-0",
        // Secondary: cream-soft fill
        secondary:
          "bg-cream-soft text-ink border-ink",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs:      "h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3 shadow-[2px_2px_0_#1F1F1F] active:shadow-[1px_1px_0_#1F1F1F]",
        sm:      "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg:      "h-10 px-6 has-[>svg]:px-4",
        icon:    "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3 shadow-[2px_2px_0_#1F1F1F] active:shadow-[1px_1px_0_#1F1F1F]",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
