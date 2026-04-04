import Link from "next/link";
import { sql } from "@/lib/db";
import { deleteRule, updateRule } from "./actions";
import { AddRuleForm } from "./add-rule-form";

export const revalidate = 0;

export default async function CategoryRulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: categoryId } = await params;

  const [category] = await sql`SELECT * FROM categories WHERE id = ${categoryId}`;

  const rules = await sql`
    SELECT * FROM category_rules
    WHERE category_id = ${categoryId}
    ORDER BY priority ASC, pattern ASC
  `;

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      <header className="space-y-1">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Rules
            </h1>
            <p className="text-sm text-slate-500">
              Auto-categorize by matching keywords in the transaction description.
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

      <section className="rounded-[var(--radius)] bg-white p-6 shadow-[var(--shadow-softer)] space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Add rule</h2>
        <AddRuleForm categoryId={categoryId} />
        <p className="text-xs text-slate-500">
          Lower priority wins. Example: <span className="font-mono">wolt</span>,{" "}
          <span className="font-mono">lieferando</span> → Eating Out.
        </p>
      </section>

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
          {rules.map((r: any) => (
            <div key={r.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
              <form action={updateRule} className="grid grid-cols-12 gap-4 items-center">
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
                    <input name="is_active" type="checkbox" defaultChecked={r.is_active} />
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

          {rules.length === 0 && (
            <div className="px-6 py-10 text-sm text-slate-500">
              No rules yet. Add your first keyword above.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
