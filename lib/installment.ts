// Detects installment patterns like "Parcela 2/3", "Parc. 01/12", "Parc 3/6"
const PATTERN =
  /\s*[-–—]?\s*(?:parcela|parc\.?)\s+(\d{1,2})\/(\d{1,2})\s*$/i;

export type InstallmentInfo = {
  index: number;       // current installment (e.g. 2)
  total: number;       // total installments (e.g. 3)
  baseDescription: string; // description without the installment suffix
};

export function parseInstallment(description: string): InstallmentInfo | null {
  const match = description.match(PATTERN);
  if (!match) return null;

  const index = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);
  if (index < 1 || total < 1 || index > total) return null;

  const baseDescription = description
    .slice(0, match.index)
    .trim()
    .replace(/[-–—\s]+$/, "")
    .trim();

  return { index, total, baseDescription };
}

