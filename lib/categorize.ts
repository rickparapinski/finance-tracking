export type CategoryRule = {
  category_id: string;
  pattern: string;
  is_case_sensitive: boolean;
  priority: number;
  category: { name: string; type: string; is_active: boolean } | null;
};

export function categorizeDescription(
  description: string,
  rules: CategoryRule[],
): string | null {
  if (!description) return null;

  for (const r of rules) {
    if (!r.category || !r.category.is_active) continue;

    const hay = r.is_case_sensitive ? description : description.toLowerCase();
    const needle = r.is_case_sensitive ? r.pattern : r.pattern.toLowerCase();

    if (hay.includes(needle)) {
      return r.category.name; // MVP keeps transactions.category as text
    }
  }
  return null;
}
