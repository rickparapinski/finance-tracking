import { sql } from "@/lib/db";
import { upsertAccount } from "./actions";
import AccountsClient from "./AccountsClient";

export const revalidate = 0;

export default async function AccountsPage() {
  const [accounts, txSums] = await Promise.all([
    sql`SELECT * FROM accounts ORDER BY name`,
    sql`SELECT account_id, SUM(amount) AS native_sum, COALESCE(SUM(amount_eur), 0) AS eur_sum FROM transactions GROUP BY account_id`,
  ]);

  const sumMap: Record<string, { native: number; eur: number }> = {};
  for (const r of txSums)
    sumMap[r.account_id] = { native: Number(r.native_sum), eur: Number(r.eur_sum) };

  const accountsWithBalance = accounts.map((a: any) => {
    const sums = sumMap[a.id] ?? { native: 0, eur: 0 };
    const nativeBalance = Number(a.initial_balance) + sums.native;
    const eurBase =
      a.initial_balance_eur != null
        ? Number(a.initial_balance_eur)
        : a.currency === "EUR"
        ? Number(a.initial_balance)
        : null;
    const eurBalance = eurBase != null ? eurBase + sums.eur : null;
    return { ...a, balance: nativeBalance, balance_eur: eurBalance };
  });

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Accounts
          </h1>
          <p className="text-sm text-slate-500">
            Create and manage your wallets, cards, and investment accounts.
          </p>
        </div>
      </header>

      <div className="rounded-[var(--radius)] bg-white p-6 shadow-[var(--shadow-softer)]">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick add</h2>

        <form
          id="account-form"
          action={upsertAccount}
          className="grid gap-4 md:grid-cols-5 items-end"
        >
          <input type="hidden" name="id" value="" />

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Name
            </label>
            <input
              name="name"
              required
              placeholder="e.g. Revolut Main"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Currency
            </label>
            <select
              name="currency"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="EUR">EUR</option>
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Type
            </label>
            <select
              name="type"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="Checking">Checking</option>
              <option value="Savings">Savings</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Investment">Investment</option>
              <option value="Loan">Loan</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Start Bal.
            </label>
            <input
              name="initial_balance"
              type="number"
              step="0.01"
              placeholder="0.00"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </form>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            form="account-form"
            className="h-10 rounded-xl bg-emerald-500 px-4 text-sm font-medium text-white shadow-[var(--shadow-softer)] hover:opacity-90 transition"
          >
            Save Account
          </button>
        </div>
      </div>

      <AccountsClient accounts={accountsWithBalance as any} />
    </main>
  );
}
