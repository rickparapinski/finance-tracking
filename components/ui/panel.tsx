/**
 * Panel — the design system card surface.
 * Named "Panel" to coexist with shadcn's Card (used in forms/modals).
 *
 * Use Panel for all dashboard content cards.
 * Use shadcn Card only in dialogs, sheets, and form contexts.
 */

interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

export function Panel({ children, className = "" }: PanelProps) {
  return (
    <div
      className={`
        bg-surface border-2 border-ink rounded-md p-4
        shadow-[2px_2px_0_rgba(31,31,31,0.09)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}
