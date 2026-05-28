/**
 * PixelBtn — retro pixel-art button.
 * Use for dashboard actions (view all, export, quick-add, etc.).
 * For form submits and destructive actions, keep shadcn's Button.
 */

interface PixelBtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
}

export function PixelBtn({
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
}: PixelBtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        font-pixel text-[10px] border-2 border-ink rounded-sm px-2.5 py-1
        bg-surface text-ink
        shadow-[2px_2px_0_#1F1F1F]
        hover:bg-lime hover:border-lime
        hover:shadow-[1px_1px_0_#1F1F1F] hover:translate-x-[1px] hover:translate-y-[1px]
        active:shadow-none active:translate-x-[2px] active:translate-y-[2px]
        disabled:opacity-40 disabled:cursor-not-allowed
        cursor-pointer transition-none select-none
        ${className}
      `}
    >
      {children}
    </button>
  );
}
