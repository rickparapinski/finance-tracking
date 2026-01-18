import { createClient } from "@supabase/supabase-js";
import { upsertAccount } from "./actions";
import AccountsClient from "./AccountsClient";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export const revalidate = 0;

export default async function AccountsPage() {
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("name");

  return (
    <main className="min-h-screen p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
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

        {/* QUICK ADD (server) */}
        <div className="rounded-[var(--radius)] bg-white p-6 shadow-[var(--shadow-softer)]">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Quick add
          </h2>

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

        {/* Table + modal (client) */}
        <AccountsClient accounts={accounts ?? []} />
      </div>
    </main>
  );
}
