import { sql } from "@/lib/db";
import { InboxClient } from "./client";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const [items, accounts, categoriesRows] = await Promise.all([
    sql`
      SELECT id, raw_text, merchant, amount, currency, created_at
      FROM staged_transactions
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `,
    sql`SELECT id, name FROM accounts WHERE status = 'active' ORDER BY name`,
    sql`SELECT name FROM categories WHERE is_active = true ORDER BY name`,
  ]);

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Inbox
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {items.length > 0
            ? `${items.length} payment${items.length !== 1 ? "s" : ""} waiting to be added`
            : "Payments captured from Apple Wallet appear here"}
        </p>
      </div>

      <InboxClient
        items={items as any[]}
        accounts={accounts as any[]}
        categories={categoriesRows.map((c: any) => c.name)}
      />
    </main>
  );
}
