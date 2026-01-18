import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardCard({
  title,
  children,
  onAdd,
  className,
}: {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius)] bg-white p-5 shadow-[var(--shadow-softer)]",
        className
      )}
    >
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <button
          type="button"
          onClick={onAdd}
          className="grid size-8 place-items-center rounded-full text-slate-300 hover:bg-slate-50 hover:text-slate-500"
          aria-label={`Add to ${title}`}
        >
          <Plus className="size-4" />
        </button>
      </header>
      {children}
    </section>
  );
}
