import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { DataTable } from "@/app/transactions/data-table";
import { columnsForAccount } from "./transactions-columns";
import { createTransaction } from "./actions";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export const revalidate = 0;

export default async function AccountDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: accountId } = await props.params;

  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("account_id", accountId)
    .order("date", { ascending: false });

  const { data: categoriesRows } = await supabase
    .from("categories")
    .select("id, name")
    .order("name", { ascending: true });

  const categories = (categoriesRows ?? []).map((c: any) => c.name);

  const uncategorizedCount = (transactions ?? []).filter(
    (t: any) =>
      !t.category || t.category.trim() === "" || t.category === "Uncategorized",
  ).length;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-6">
      <header className="space-y-1">
        <Link
          href="/accounts"
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← Back to Accounts
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mt-2">
          {account?.name ?? "Account"}
        </h1>

        <p className="text-sm text-slate-500">
          {account?.type} • {account?.currency}
        </p>
      </header>

      {/* QUICK ADD TRANSACTION */}
      <div className="rounded-[var(--radius)] bg-white p-6 shadow-[var(--shadow-softer)]">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Add</h3>
        <form
          id="quick-tx-form"
          action={createTransaction}
          className="flex flex-wrap gap-3 items-end"
        >
          <input type="hidden" name="account_id" value={accountId} />

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Date
            </label>
            <input
              type="date"
              name="date"
              defaultValue={today}
              required
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="md:col-span-8">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Description
            </label>
            <input
              name="description"
              required
              placeholder="e.g. REWE groceries"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Category
            </label>
            <select
              name="category"
              defaultValue="Uncategorized"
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="Uncategorized">Uncategorized</option>
              {categories
                .filter((c) => c && c !== "Uncategorized")
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Amount ({account?.currency ?? "EUR"})
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              required
              placeholder="-12.90"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </form>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            form="quick-tx-form"
            className="h-10 rounded-xl bg-emerald-500 px-5 text-sm font-medium text-white shadow-[var(--shadow-softer)] hover:opacity-90 transition"
          >
            Add transaction
          </button>
        </div>
      </div>

      {/* TABLE (includes Edit modal automatically) */}
      <DataTable
        columns={columnsForAccount}
        data={(transactions ?? []) as any}
        categories={categories}
        uncategorizedCount={uncategorizedCount}
      />
    </main>
  );
}
