import { sql } from "@/lib/db";
import { fetchCurrentCycle } from "@/lib/fetch-cycle";
import { buildPeriodList } from "@/lib/periods";
import { CategoriesClientPage } from "./client-page";

export const revalidate = 0;

export default async function CategoriesPage() {
  const { start, end, key } = await fetchCurrentCycle();
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const periods = buildPeriodList(startStr, endStr, key);

  const [categories, spending] = await Promise.all([
    sql`SELECT * FROM categories ORDER BY sort_order ASC, name ASC`,
    sql`
      SELECT category, SUM(ABS(amount_eur)) AS total
      FROM transactions
      WHERE date >= ${startStr} AND date <= ${endStr} AND amount < 0
      GROUP BY category
    `,
  ]);

  const spendingMap = Object.fromEntries(
    spending.map((r: any) => [r.category, Number(r.total)]),
  );

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      <CategoriesClientPage
        categories={categories as any[]}
        spendingMap={spendingMap}
        periods={periods}
        currentCycleKey={key}
      />
    </main>
  );
}
