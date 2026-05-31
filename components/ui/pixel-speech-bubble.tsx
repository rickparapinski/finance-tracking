import { cn } from "@/lib/utils";

// Pure-CSS pixel speech bubble — stacked div technique from codepen.io/glenthemes/pen/aMWeRb
// No SVG, no ResizeObserver, auto-sizes to content.

interface PixelSpeechBubbleProps {
  children: React.ReactNode;
  className?: string;
}

export function PixelSpeechBubble({ children, className }: PixelSpeechBubbleProps) {
  return (
    <div className={cn("inline-block min-w-[9rem]", className)}>
      {/* top stepped corners */}
      <div className="mx-[6px] h-[2px] bg-ink" />
      <div className="mx-[4px] h-[2px] bg-white border-l-2 border-r-2 border-ink" />
      <div className="mx-[2px] h-[2px] bg-white border-l-2 border-r-2 border-ink" />

      {/* body */}
      <div className="border-l-2 border-r-2 border-ink bg-white px-4 py-3 font-pixel text-sm text-ink leading-snug text-center">
        {children}
      </div>

      {/* bottom stepped corners */}
      <div className="mx-[2px] h-[2px] bg-white border-l-2 border-r-2 border-ink" />
      <div className="mx-[4px] h-[2px] bg-white border-l-2 border-r-2 border-ink" />
      <div className="mx-[6px] h-[2px] bg-ink" />

      {/* centered bottom tail — overlaps last ink bar by 2px to connect cleanly */}
      <div className="flex justify-center -mt-[2px]">
        <div className="flex flex-col items-center">
          <div className="w-[12px] h-[8px] bg-white border-l-2 border-r-2 border-ink" />
          <div className="w-[8px]  h-[2px] bg-white border-l-2 border-r-2 border-ink" />
          <div className="w-[4px]  h-[2px] bg-ink" />
        </div>
      </div>
    </div>
  );
}
