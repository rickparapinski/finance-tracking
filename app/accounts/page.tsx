import { sql } from "@/lib/db";
import AccountsClient from "./AccountsClient";

export const revalidate = 0;

export default async function AccountsPage() {
  const [accounts, txSums] = await Promise.all([
    sql`SELECT * FROM accounts ORDER BY name`,
    sql`
      SELECT account_id,
             SUM(amount)                       AS native_sum,
             COALESCE(SUM(amount_eur), 0)      AS eur_sum
      FROM transactions
      GROUP BY account_id
    `,
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
    <main className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <AccountsClient accounts={accountsWithBalance as any} />
    </main>
  );
}
