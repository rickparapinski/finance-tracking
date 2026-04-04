import Link from "next/link";
import { sql } from "@/lib/db";
import { CategoriesClientPage } from "./client-page";

export const revalidate = 0;

export default async function CategoriesPage() {
  const categories = await sql`
    SELECT * FROM categories
    ORDER BY sort_order ASC, name ASC
  `;

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto space-y-8">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Categories
          </h1>
          <p className="text-sm text-slate-500">
            Manage spending categories and monthly budgets.
          </p>
        </div>
        <Link
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
          href="/"
        >
          &larr; Back to Dashboard
        </Link>
      </header>

      <CategoriesClientPage categories={categories as any[]} />
    </main>
  );
}
