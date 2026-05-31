import { PixelBadge } from "./pixel-badge";

interface CategoryBadgeProps {
  name: string;
  className?: string;
}

export function CategoryBadge({ name, className = "" }: CategoryBadgeProps) {
  const isUncategorized = !name || name === "Uncategorized";
  return (
    <PixelBadge
      variant={isUncategorized ? "muted" : "default"}
      className={`uppercase tracking-wide ${className}`}
    >
      {isUncategorized ? "—" : name}
    </PixelBadge>
  );
}
