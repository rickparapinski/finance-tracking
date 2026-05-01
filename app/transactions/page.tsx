import { sql } from "@/lib/db";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { TransactionsTop } from "./transactions-top";
import Link from "next/link";

export const revalidate = 0;

export default async function TransactionsPage() {
  const [transactions, accounts, categories, tagRows] = await Promise.all([
    sql`
      SELECT t.*, json_build_object('name', a.name) AS accounts
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      ORDER BY t.date DESC
    `,
    sql`SELECT id, name, currency FROM accounts WHERE status = 'active' ORDER BY name`,
    sql`SELECT id, name FROM categories ORDER BY name ASC`,
    sql`SELECT DISTINCT tag FROM transactions WHERE tag IS NOT NULL ORDER BY tag`,
  ]);

  const allTags = tagRows.map((r: any) => r.tag as string);
  const totalCount = transactions.length;

  const uncategorizedCount = transactions.filter(
    (t: any) =>
      !t.category || t.category.trim() === "" || t.category === "Uncategorized",
  ).length;

  return (
    <main className="min-h-screen bg-cream p-6 max-w-6xl mx-auto space-y-4">
      {/* ── Header + collapsible Quick Add ── */}
      <TransactionsTop
        accounts={accounts as any}
        categories={categories.map((c: any) => c.name)}
        totalCount={totalCount}
      />

      {/* ── Uncategorized nudge ── */}
      {uncategorizedCount > 0 && (
        <div className="border-2 border-ink/30 bg-surface rounded-md px-4 py-3 shadow-[2px_2px_0_rgba(31,31,31,0.06)] flex items-center justify-between gap-4">
          <span className="font-sans text-[12px] text-ink/60">
            <span className="font-semibold text-ink/80">{uncategorizedCount}</span>{" "}
            transactions need a category.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/categories"
              className="font-pixel text-[10px] border-2 border-ink/30 text-ink/50 px-2 py-1 rounded-md hover:border-ink/60 hover:text-ink/70 transition-none"
            >
              manage
            </Link>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {transactions && (
        <DataTable
          columns={columns}
          data={transactions as any}
          categories={categories.map((c: any) => c.name)}
          accounts={accounts.map((a: any) => ({ id: a.id, name: a.name }))}
          allTags={allTags}
          uncategorizedCount={uncategorizedCount}
        />
      )}
    </main>
  );
}
