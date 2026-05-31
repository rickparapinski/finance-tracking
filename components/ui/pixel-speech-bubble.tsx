import { cn } from "@/lib/utils";

// Pure-CSS pixel speech bubble — stacked div technique from codepen.io/glenthemes/pen/aMWeRb
// No SVG, no ResizeObserver, auto-sizes to content.

interface PixelSpeechBubbleProps {
  children: React.ReactNode;
  className?: string;
  tail?: "bottom" | "left" | "none";
}

function BubbleBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-[9rem]">
      <div className="mx-[6px] h-[2px] bg-ink" />
      <div className="mx-[4px] h-[2px] bg-white border-l-2 border-r-2 border-ink" />
      <div className="mx-[2px] h-[2px] bg-white border-l-2 border-r-2 border-ink" />
      <div className="border-l-2 border-r-2 border-ink bg-white px-4 py-3 font-pixel text-sm text-ink leading-snug text-center">
        {children}
      </div>
      <div className="mx-[2px] h-[2px] bg-white border-l-2 border-r-2 border-ink" />
      <div className="mx-[4px] h-[2px] bg-white border-l-2 border-r-2 border-ink" />
      <div className="mx-[6px] h-[2px] bg-ink" />
    </div>
  );
}

export function PixelSpeechBubble({ children, className, tail = "bottom" }: PixelSpeechBubbleProps) {
  if (tail === "left") {
    return (
      <div className={cn("inline-flex flex-row items-center", className)}>
        {/* left tail: tip → step → neck, right-to-left */}
        <div className="flex flex-row items-center -mr-[2px]">
          <div className="w-[2px] h-[4px] bg-ink" />
          <div className="w-[2px] h-[8px] bg-white border-t-2 border-b-2 border-ink" />
          <div className="w-[8px] h-[12px] bg-white border-t-2 border-b-2 border-ink" />
        </div>
        <BubbleBox>{children}</BubbleBox>
      </div>
    );
  }

  return (
    <div className={cn("inline-block", className)}>
      <BubbleBox>{children}</BubbleBox>
      {tail === "bottom" && (
        <div className="flex justify-center -mt-[2px]">
          <div className="flex flex-col items-center">
            <div className="w-[12px] h-[8px] bg-white border-l-2 border-r-2 border-ink" />
            <div className="w-[8px]  h-[2px] bg-white border-l-2 border-r-2 border-ink" />
            <div className="w-[4px]  h-[2px] bg-ink" />
          </div>
        </div>
      )}
    </div>
  );
}
