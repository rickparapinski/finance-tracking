import { sql } from "@/lib/db";
import { fetchCurrentCycle } from "@/lib/fetch-cycle";
import { CategoriesClientPage } from "./client-page";

export const revalidate = 0;

export default async function CategoriesPage() {
  const { start, end, key } = await fetchCurrentCycle();
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const [categories, spending, cycles] = await Promise.all([
    sql`SELECT * FROM categories ORDER BY sort_order ASC, name ASC`,
    sql`
      SELECT category, SUM(ABS(amount_eur)) AS total
      FROM transactions
      WHERE date >= ${startStr} AND date <= ${endStr} AND amount < 0
      GROUP BY category
    `,
    sql`SELECT key, start_date, end_date FROM cycles ORDER BY start_date DESC LIMIT 12`,
  ]);

  const spendingMap = Object.fromEntries(
    spending.map((r: any) => [r.category, Number(r.total)]),
  );

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      <CategoriesClientPage
        categories={categories as any[]}
        spendingMap={spendingMap}
        cycles={cycles as any[]}
        currentCycleKey={key}
        currentStart={startStr}
        currentEnd={endStr}
      />
    </main>
  );
}
