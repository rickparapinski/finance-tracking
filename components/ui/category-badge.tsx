interface CategoryBadgeProps {
  name: string;
  className?: string;
}

export function CategoryBadge({ name, className = "" }: CategoryBadgeProps) {
  const isUncategorized = !name || name === "Uncategorized";
  return (
    <span
      className={`inline-flex items-center border-2 rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide leading-none whitespace-nowrap ${
        isUncategorized
          ? "border-ink/15 text-ink/25"
          : "border-ink/40 text-ink/55"
      } ${className}`}
    >
      {isUncategorized ? "—" : name}
    </span>
  );
}
