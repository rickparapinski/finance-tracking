import { sql } from "@/lib/db";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { QuickAddForm } from "@/components/quick-add-form";
import Link from "next/link";

export const revalidate = 0;

export default async function TransactionsPage() {
  const transactions = await sql`
    SELECT t.*, json_build_object('name', a.name) AS accounts
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    ORDER BY t.date DESC
  `;

  const accounts = await sql`SELECT id, name, currency FROM accounts WHERE status = 'active' ORDER BY name`;

  const categories = await sql`
    SELECT id, name FROM categories ORDER BY name ASC
  `;

  const uncategorizedCount = transactions.filter(
    (t: any) =>
      !t.category || t.category.trim() === "" || t.category === "Uncategorized",
  ).length;

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Transactions
        </h1>
        <p className="text-sm text-slate-500">
          Browse, filter, edit and add entries.
        </p>
      </header>

      <QuickAddForm
        accounts={accounts as any}
        categories={categories.map((c: any) => c.name)}
      />

      {uncategorizedCount > 0 && (
        <div className="rounded-[var(--radius)] border border-amber-200 bg-amber-50 px-5 py-4 shadow-[var(--shadow-softer)] flex items-center justify-between gap-4">
          <div className="text-sm text-amber-900">
            You have <span className="font-semibold">{uncategorizedCount}</span>{" "}
            uncategorized transactions.
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#uncategorized"
              className="h-9 rounded-xl bg-amber-600 px-4 text-xs font-medium text-white hover:opacity-90 transition grid place-items-center"
            >
              Assign here
            </a>
            <Link
              href="/categories"
              className="h-9 rounded-xl border border-amber-300 px-4 text-xs font-medium text-amber-900 hover:bg-amber-100 transition grid place-items-center"
            >
              Manage categories
            </Link>
          </div>
        </div>
      )}

      {transactions && (
        <DataTable
          columns={columns}
          data={transactions as any}
          categories={categories.map((c: any) => c.name)}
          accounts={accounts.map((a: any) => ({ id: a.id, name: a.name }))}
          uncategorizedCount={uncategorizedCount}
        />
      )}
    </main>
  );
}
