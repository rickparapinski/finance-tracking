import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { sql } from "@/lib/db";
import { AppSidebar } from "@/components/layout/app-sidebar";
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
  const accounts = await sql`
    SELECT id, name, currency, color, initial_balance
    FROM accounts
    ORDER BY name
  `;

  const transactions = await sql`
    SELECT account_id, amount FROM transactions
  `;

  const accountsWithBalance = accounts.map((acc) => {
    const totalActivity =
      transactions
        .filter((t) => t.account_id === acc.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      ...acc,
      balance: Number(acc.initial_balance) + totalActivity,
    };
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-foreground`}
      >
        <div className="flex min-h-screen">
          <aside className="hidden md:block fixed inset-y-0 left-0 z-10 w-64 border-r border-border">
            <AppSidebar accounts={accountsWithBalance} />
          </aside>
          <main className="flex-1 md:pl-64">{children}</main>
        </div>
      </body>
    </html>
  );
}
