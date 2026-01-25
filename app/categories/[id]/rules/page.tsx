import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { createRule, deleteRule, updateRule } from "./actions";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export const revalidate = 0;

export default async function CategoryRulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: categoryId } = await params;

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .single();

  const { data: rules } = await supabase
    .from("category_rules")
    .select("*")
    .eq("category_id", categoryId)
    .order("priority", { ascending: true })
    .order("pattern", { ascending: true });

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      <header className="space-y-1">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Rules
            </h1>
            <p className="text-sm text-slate-500">
              Auto-categorize by matching keywords in the transaction
              description.
            </p>
          </div>
          <Link
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
            href="/categories"
          >
            &larr; Back
          </Link>
        </div>
        {category && (
          <div className="text-sm text-slate-600">
            Category:{" "}
            <span className="font-medium text-slate-900">{category.name}</span>
          </div>
        )}
      </header>

      {/* Add rule */}
      <section className="rounded-[var(--radius)] bg-white p-6 shadow-[var(--shadow-softer)] space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Add rule</h2>
        <form action={createRule} className="flex flex-wrap gap-3 items-end">
          <input type="hidden" name="category_id" value={categoryId} />
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Keyword (contains)
            </label>
            <input
              name="pattern"
              placeholder="e.g. wolt"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              required
            />
          </div>

          <div className="w-32">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Priority
            </label>
            <input
              name="priority"
              type="number"
              defaultValue={100}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {/* NEW CHECKBOX */}
          <div className="flex items-center h-10 pb-1">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                name="apply_existing"
                defaultChecked
                className="accent-emerald-500 w-4 h-4"
              />
              Apply to existing uncategorized
            </label>
          </div>

          <button className="h-10 rounded-xl bg-emerald-500 px-4 text-sm font-medium text-white shadow-[var(--shadow-softer)] hover:opacity-90 transition">
            Add
          </button>
        </form>

        <p className="text-xs text-slate-500">
          Lower priority wins. Example: <span className="font-mono">wolt</span>,{" "}
          <span className="font-mono">lieferando</span> → Eating Out.
        </p>
      </section>

      {/* Rules list */}
      <section className="rounded-[var(--radius)] bg-white shadow-[var(--shadow-softer)] overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-600">
            <div className="col-span-5">Pattern</div>
            <div className="col-span-2">Priority</div>
            <div className="col-span-2">Active</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {rules?.map((r) => (
            <div
              key={r.id}
              className="px-6 py-4 hover:bg-slate-50 transition-colors"
            >
              <form
                action={updateRule}
                className="grid grid-cols-12 gap-4 items-center"
              >
                <input type="hidden" name="category_id" value={categoryId} />
                <input type="hidden" name="id" value={r.id} />

                <div className="col-span-5">
                  <input
                    name="pattern"
                    defaultValue={r.pattern}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="col-span-2">
                  <input
                    name="priority"
                    type="number"
                    defaultValue={r.priority}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="col-span-2 text-sm text-slate-600">
                  <label className="inline-flex items-center gap-2">
                    <input
                      name="is_active"
                      type="checkbox"
                      defaultChecked={r.is_active}
                    />
                    Active
                  </label>
                </div>

                <div className="col-span-3 flex justify-end gap-2">
                  <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition">
                    Save
                  </button>

                  <button
                    formAction={deleteRule}
                    className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                  >
                    Delete
                  </button>
                </div>
              </form>
            </div>
          ))}

          {(!rules || rules.length === 0) && (
            <div className="px-6 py-10 text-sm text-slate-500">
              No rules yet. Add your first keyword above.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
