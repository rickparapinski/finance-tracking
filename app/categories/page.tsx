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

  const fmt = (n: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

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

      {/* Create Form */}
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

          <div className="w-32">
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

          <div className="w-32">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Budget (€)
            </label>
            <input
              name="monthly_budget"
              type="number"
              step="1"
              placeholder="0"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="w-32">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Color
            </label>
            <input
              name="color"
              placeholder="#10b981"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <button className="h-10 rounded-xl bg-emerald-500 px-4 text-sm font-medium text-white shadow-[var(--shadow-softer)] hover:opacity-90 transition">
            Add
          </button>
        </form>
      </section>

      {/* List Table */}
      <section className="rounded-[var(--radius)] bg-white shadow-[var(--shadow-softer)] overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-600">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Budget</div>
            <div className="col-span-2">Rules</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {categories?.map((c) => (
            <div
              key={c.id}
              className="px-6 py-4 hover:bg-slate-50 transition-colors grid grid-cols-12 gap-4 items-center"
            >
              {/* 1. Static Info */}
              <div className="col-span-3">
                <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  {c.color && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                  )}
                  {c.name}
                </div>
                {!c.is_active && (
                  <div className="text-xs text-slate-400">Inactive</div>
                )}
              </div>

              <div className="col-span-2 text-sm text-slate-600 capitalize">
                {c.type}
              </div>

              {/* 2. Update Form (Budget + Active + Save) */}
              <form
                action={updateCategory}
                className="col-span-7 grid grid-cols-7 gap-4 items-center"
              >
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="name" value={c.name} />
                <input type="hidden" name="type" value={c.type} />
                <input type="hidden" name="color" value={c.color ?? ""} />

                {/* Budget Input */}
                <div className="col-span-2">
                  <input
                    name="monthly_budget"
                    type="number"
                    defaultValue={c.monthly_budget ?? 0}
                    className="w-24 h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-900 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {/* Rules Link */}
                <div className="col-span-2">
                  <Link
                    href={`/categories/${c.id}/rules`}
                    className="text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    Manage rules →
                  </Link>
                </div>

                {/* Save + Active */}
                <div className="col-span-3 flex justify-end gap-3 items-center">
                  <label className="text-xs text-slate-500 flex items-center gap-1 cursor-pointer">
                    <input
                      name="is_active"
                      type="checkbox"
                      defaultChecked={c.is_active}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Active
                  </label>
                  <button className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition">
                    Save
                  </button>

                  {/* Visual separator before delete */}
                  <div className="w-px h-4 bg-slate-200 mx-1"></div>
                </div>
              </form>

              {/* 3. Delete Form (This actually needs to float or be outside the grid flow if we want it perfect, 
                  but we can't nest forms. So we put it HERE, but visually push it into the flex container above? 
                  No, we can't. 
                  
                  Simpler Solution: Put the delete button separate in the layout.
              */}
              <div className="col-start-12 col-span-1 flex justify-end -ml-12">
                <form action={deleteCategory.bind(null, c.id)}>
                  <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
                    Del
                  </button>
                </form>
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
