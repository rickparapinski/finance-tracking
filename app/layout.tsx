import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { sql } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { ClientProviders } from "@/components/layout/client-providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Finance Tracker",
  description: "2026 Financial Planning",
};

export const revalidate = 0;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isLoginPage = pathname === "/login";

  let accountsWithBalance: any[] = [];
  let inboxCount = 0;
  let daysSinceLastLog = 0;

  if (!isLoginPage) {
    try {
      const [accounts, txSums, inboxRows, lastLogRows] = await Promise.all([
        sql`
          SELECT id, name, currency, color, initial_balance, initial_balance_eur
          FROM accounts
          ORDER BY name
        `,
        sql`
          SELECT account_id, COALESCE(SUM(amount_eur), 0) AS eur_sum
          FROM transactions
          GROUP BY account_id
        `,
        sql`SELECT COUNT(*) AS n FROM staged_transactions WHERE status = 'pending'`,
        sql`SELECT MAX(date) AS last_date FROM transactions`,
      ]);
      inboxCount = Number(inboxRows[0]?.n ?? 0);

      const lastDate = lastLogRows[0]?.last_date;
      if (lastDate) {
        const diffMs = Date.now() - new Date(lastDate).getTime();
        daysSinceLastLog = Math.floor(diffMs / 86400000);
      }

      const eurSumMap: Record<string, number> = {};
      for (const r of txSums) eurSumMap[r.account_id] = Number(r.eur_sum);

      accountsWithBalance = accounts.map((acc) => {
        const eurBase =
          acc.initial_balance_eur != null
            ? Number(acc.initial_balance_eur)
            : acc.currency === "EUR"
            ? Number(acc.initial_balance)
            : 0;
        return {
          ...acc,
          balance: eurBase + (eurSumMap[acc.id] ?? 0),
        };
      });
    } catch {
      // DB unavailable — render without sidebar account data
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-foreground`}
      >
        {isLoginPage ? (
          children
        ) : (
          <ClientProviders>
            <AppShell
              accounts={accountsWithBalance}
              inboxCount={inboxCount}
              daysSinceLastLog={daysSinceLastLog}
            >
              {children}
            </AppShell>
          </ClientProviders>
        )}
      </body>
    </html>
  );
}
