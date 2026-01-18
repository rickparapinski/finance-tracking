import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { createCategory, deleteCategory, updateCategory } from "./actions";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export const revalidate = 0;

export default async function CategoriesPage() {
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex items-end justify-between max-w-6xl mx-auto space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Categories
          </h1>
          <p className="text-sm text-slate-500">
            Create categories and manage keyword rules used for
            auto-categorization.
          </p>
        </div>
        <Link
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
          href="/"
        >
          &larr; Back
        </Link>
      </header>

      {/* Create */}
      <section className="rounded-[var(--radius)] bg-white p-6 shadow-[var(--shadow-softer)] space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Add category</h2>
        <form
          action={createCategory}
          className="flex flex-wrap gap-3 items-end"
        >
          <div className="min-w-[220px] flex-1">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Name
            </label>
            <input
              name="name"
              placeholder="Eating Out"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              required
            />
          </div>

          <div className="w-40">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Type
            </label>
            <select
              name="type"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              defaultValue="expense"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div className="w-40">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Color (optional)
            </label>
            <input
              name="color"
              placeholder="slate / #10b981"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <button className="h-10 rounded-xl bg-emerald-500 px-4 text-sm font-medium text-white shadow-[var(--shadow-softer)] hover:opacity-90 transition">
            Add
          </button>
        </form>
      </section>

      {/* List */}
      <section className="rounded-[var(--radius)] bg-white shadow-[var(--shadow-softer)] overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-600">
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Rules</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {categories?.map((c) => (
            <div
              key={c.id}
              className="px-6 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4">
                  <div className="text-sm font-medium text-slate-900">
                    {c.name}
                  </div>
                  {!c.is_active && (
                    <div className="text-xs text-slate-400">Inactive</div>
                  )}
                </div>

                <div className="col-span-2 text-sm text-slate-600">
                  {c.type}
                </div>

                <div className="col-span-3">
                  <Link
                    href={`/categories/${c.id}/rules`}
                    className="text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    Manage rules →
                  </Link>
                </div>

                <div className="col-span-3 flex justify-end gap-2">
                  {/* Quick inline update (simple) */}
                  <form
                    action={updateCategory}
                    className="flex gap-2 items-center"
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="name" value={c.name} />
                    <input type="hidden" name="type" value={c.type} />
                    <input type="hidden" name="color" value={c.color ?? ""} />
                    <label className="text-xs text-slate-500 flex items-center gap-2">
                      Active
                      <input
                        name="is_active"
                        type="checkbox"
                        defaultChecked={c.is_active}
                      />
                    </label>
                    <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition">
                      Save
                    </button>
                  </form>

                  <form action={deleteCategory.bind(null, c.id)}>
                    <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}

          {(!categories || categories.length === 0) && (
            <div className="px-6 py-10 text-sm text-slate-500">
              No categories yet. Add your first one above.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
