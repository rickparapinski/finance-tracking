import { sql } from "@/lib/db";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { createManualTransaction } from "./actions";
import Link from "next/link";

export const revalidate = 0;

export default async function TransactionsPage() {
  const transactions = await sql`
    SELECT t.*, json_build_object('name', a.name) AS accounts
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    ORDER BY t.date DESC
  `;

  const accounts = await sql`SELECT id, name FROM accounts`;

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

      <div className="rounded-[var(--radius)] bg-white p-5 shadow-[var(--shadow-softer)]">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Add</h3>
        <form
          action={createManualTransaction}
          className="flex flex-wrap gap-3 items-end"
        >
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
              Date
            </label>
            <input
              type="date"
              name="date"
              required
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
              Description
            </label>
            <input
              name="description"
              placeholder="e.g. Groceries"
              required
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="w-48">
            <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
              Category
            </label>
            <select
              name="category"
              defaultValue="Uncategorized"
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="Uncategorized">Uncategorized</option>
              {(categories ?? [])
                .map((c: any) => c.name)
                .filter((n: string) => n && n !== "Uncategorized")
                .map((name: string) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
              Account
            </label>
            <select
              name="account_id"
              required
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
              Amount
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              placeholder="-0.00"
              required
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <button className="h-10 rounded-xl bg-emerald-500 px-5 text-sm font-medium text-white shadow-[var(--shadow-softer)] hover:opacity-90 transition">
            Add
          </button>
        </form>
      </div>

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
