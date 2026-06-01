import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";

// Pixel border via equal box-shadow on all 4 sides — pixelactui technique.
// m-[2px] compensates for the shadow extent so sibling layout isn't disrupted.
const pixelBadgeVariants = cva(
  "inline-flex items-center rounded-none font-mono text-[10px] leading-none whitespace-nowrap px-1.5 py-0.5 m-[2px] " +
  "shadow-[-2px_0_0_0_var(--pb-shadow),2px_0_0_0_var(--pb-shadow),0_2px_0_0_var(--pb-shadow),0_-2px_0_0_var(--pb-shadow)]",
  {
    variants: {
      variant: {
        default:  "bg-surface text-ink/55 [--pb-shadow:rgba(31,31,31,0.35)]",
        muted:    "bg-transparent text-ink/30 [--pb-shadow:rgba(31,31,31,0.15)]",
        active:   "bg-lime text-ink [--pb-shadow:#1F1F1F]",
        dark:     "bg-ink text-cream-soft [--pb-shadow:#1F1F1F]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface PixelBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pixelBadgeVariants> {}

export function PixelBadge({ className, variant, children, ...props }: PixelBadgeProps) {
  return (
    <span className={cn(pixelBadgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}
