import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@supabase/supabase-js";
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

// Initialize Supabase Client (Server-side compatible)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 0; // Ensure sidebar balances are always fresh

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 1. Fetch Accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, currency, color, initial_balance")
    .order("name");

  // 2. Fetch Transactions to Calculate Balance
  // Optimization: In a huge app, you'd use a SQL View for this.
  // For now, fetching simplified transaction data is fast enough.
  const { data: transactions } = await supabase
    .from("transactions")
    .select("account_id, amount");

  // 3. Calculate Real-Time Balances
  const accountsWithBalance =
    accounts?.map((acc) => {
      const totalActivity =
        transactions
          ?.filter((t) => t.account_id === acc.id)
          .reduce((sum, t) => sum + t.amount, 0) || 0;

      return {
        ...acc,
        balance: (acc.initial_balance || 0) + totalActivity,
      };
    }) || [];

  return (
    <html lang="en" suppressHydrationWarning>
      {/* Added 'dark' class by default for the premium look */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-foreground`}
      >
        <div className="flex min-h-screen">
          {/* Sidebar (Fixed on Desktop) */}
          <aside className="hidden md:block fixed inset-y-0 left-0 z-10 w-64 border-r border-border">
            <AppSidebar accounts={accountsWithBalance} />
          </aside>

          {/* Main Content */}
          <main className="flex-1 md:pl-64">{children}</main>
        </div>
      </body>
    </html>
  );
}
