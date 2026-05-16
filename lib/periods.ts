export type Period = {
  key: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
};

/**
 * Build a list of billing periods going backwards from the current one.
 * Assumes each period starts on the same day-of-month as `currentStart`.
 *
 * Example: currentStart = 2026-03-25, currentEnd = 2026-04-27
 *   → 2026-02-25 – 2026-03-24
 *   → 2026-01-25 – 2026-02-24
 *   ...
 */
export function buildPeriodList(
  currentStart: string,
  currentEnd: string,
  currentKey: string,
  count = 13 // current + 12 past
): Period[] {
  const toStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const cycleDay = parseInt(currentStart.split("-")[2], 10);

  const periods: Period[] = [
    { key: currentKey, start_date: currentStart, end_date: currentEnd },
  ];

  // Walk backwards one month at a time
  let periodStart = new Date(currentStart + "T00:00:00");

  for (let i = 0; i < count - 1; i++) {
    // End of previous period = one day before this period's start
    const end = new Date(periodStart);
    end.setDate(end.getDate() - 1);

    // Start of previous period = same cycleDay, one month before end
    let sm = end.getMonth();     // month of end date
    let sy = end.getFullYear();
    // We want the cycleDay of the month BEFORE end's month
    sm -= 1;
    if (sm < 0) { sm = 11; sy -= 1; }

    // Clamp to last day of that month (e.g. Feb 28 if cycleDay=31)
    const lastDay = new Date(sy, sm + 1, 0).getDate();
    const start = new Date(sy, sm, Math.min(cycleDay, lastDay));

    const key = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`;
    periods.push({ key, start_date: toStr(start), end_date: toStr(end) });

    periodStart = new Date(start);
  }

  return periods; // index 0 = current (newest), last = oldest
}

export function fmtPeriodLabel(start: string, end: string): string {
  const fmt = (s: string) => {
    const d = new Date(s + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };
  const endD = new Date(end + "T00:00:00");
  return `${fmt(start)} – ${fmt(end)} ${endD.getFullYear()}`;
}
