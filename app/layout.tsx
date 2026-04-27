import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { sql } from "@/lib/db";
import { AppSidebar } from "@/components/layout/app-sidebar";
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

  if (!isLoginPage) {
    try {
      const [accounts, txSums, inboxRows] = await Promise.all([
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
      ]);
      inboxCount = Number(inboxRows[0]?.n ?? 0);

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
            <div className="flex min-h-screen">
              <aside className="hidden md:block fixed inset-y-0 left-0 z-10 w-64 border-r border-border">
                <AppSidebar accounts={accountsWithBalance} inboxCount={inboxCount} />
              </aside>
              <main className="flex-1 md:pl-64">{children}</main>
            </div>
          </ClientProviders>
        )}
      </body>
    </html>
  );
}
