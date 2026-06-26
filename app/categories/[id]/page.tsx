import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { fetchCurrentCycle } from "@/lib/fetch-cycle";
import { buildPeriodList } from "@/lib/periods";
import { CategoryDetailClient } from "./category-detail-client";
import { TransactionsSection } from "./transactions-section";

export const revalidate = 0;

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: slugOrId } = await params;

  // Accept both slug (new) and UUID (old bookmarks). Postgres won't cast a
  // slug string to uuid, so we branch in JS rather than using OR in SQL.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  const [category] = isUuid
    ? await sql`SELECT * FROM categories WHERE id = ${slugOrId} LIMIT 1`
    : await sql`SELECT * FROM categories WHERE slug = ${slugOrId} LIMIT 1`;
  if (!category) redirect("/categories");

  const categoryId = category.id as string;

  const { start, end, key } = await fetchCurrentCycle();
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const periods = buildPeriodList(startStr, endStr, key);
  const prevPeriod = periods[1];

  const [rules, transactions, categoriesRows, accountsRows, spentRows] = await Promise.all([
    sql`SELECT * FROM category_rules WHERE category_id = ${categoryId} ORDER BY priority ASC, pattern ASC`,
    sql`
      SELECT t.*, json_build_object('name', a.name) AS accounts
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.category = ${category.name}
      ORDER BY t.date DESC
    `,
    sql`SELECT name FROM categories ORDER BY name ASC`,
    sql`SELECT id, name FROM accounts`,
    sql`
      SELECT COALESCE(SUM(ABS(amount_eur)), 0) AS total
      FROM transactions
      WHERE category = ${category.name}
        AND date >= ${startStr} AND date <= ${endStr}
        AND amount < 0
    `,
  ]);
  const cycleSpendt = Number(spentRows[0]?.total ?? 0);

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <CategoryDetailClient
        category={category as any}
        rules={rules as any[]}
        cycleSpendt={cycleSpendt}
      />

      <TransactionsSection
        categoryName={category.name as string}
        initialTransactions={transactions as any[]}
        cycleFrom={startStr}
        cycleTo={endStr}
        prevCycleFrom={prevPeriod?.start_date ?? ""}
        prevCycleTo={prevPeriod?.end_date ?? ""}
        categories={categoriesRows.map((c: any) => c.name)}
        accounts={accountsRows.map((a: any) => ({ id: a.id, name: a.name }))}
      />
    </main>
  );
}
