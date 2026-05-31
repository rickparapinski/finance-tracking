"use client";

import { cn } from "@/lib/utils";
import { Nah } from "@/components/Nah";
import { PixelSpeechBubble } from "./pixel-speech-bubble";

interface NahBubbleProps {
  children: React.ReactNode;
  expression?: "default" | "skeptical" | "disappointed" | "approving" | "hyped";
  className?: string;
  nahSize?: number;
  /** "below" — Nah under bubble (default). "side" — Nah left, bubble right. */
  layout?: "below" | "side";
}

export function NahBubble({
  children,
  expression = "default",
  className,
  nahSize = 48,
  layout = "below",
}: NahBubbleProps) {
  if (layout === "side") {
    return (
      <div className={cn("inline-flex flex-row items-center gap-3", className)}>
        <Nah expression={expression} size={nahSize} />
        <PixelSpeechBubble tail="left">{children}</PixelSpeechBubble>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex flex-col items-center gap-0.5", className)}>
      <PixelSpeechBubble>{children}</PixelSpeechBubble>
      <Nah expression={expression} size={nahSize} />
    </div>
  );
}
