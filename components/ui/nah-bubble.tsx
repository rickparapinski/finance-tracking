"use client";

import { cn } from "@/lib/utils";
import { Nah } from "@/components/Nah";
import { PixelSpeechBubble } from "./pixel-speech-bubble";

interface NahBubbleProps {
  children: React.ReactNode;
  expression?: "default" | "skeptical" | "disappointed" | "approving" | "hyped";
  className?: string;
  nahSize?: number;
}

/**
 * NahBubble — pixel art speech bubble with Nah mascot below.
 * Bubble tail points down toward Nah.
 *
 *   <NahBubble expression="skeptical">you sure?</NahBubble>
 */
export function NahBubble({
  children,
  expression = "default",
  className,
  nahSize = 48,
}: NahBubbleProps) {
  return (
    <div className={cn("inline-flex flex-col items-center gap-0.5", className)}>
      <PixelSpeechBubble>{children}</PixelSpeechBubble>
      <Nah expression={expression} size={nahSize} />
    </div>
  );
}
