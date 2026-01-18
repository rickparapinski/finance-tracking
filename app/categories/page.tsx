import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { CategoriesClientPage } from "./client-page";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export const revalidate = 0;

export default async function CategoriesPage() {
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

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

      {/* Pass the data to the client component */}
      <CategoriesClientPage categories={categories as any[]} />
    </main>
  );
}
