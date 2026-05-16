import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { fetchCurrentCycle } from "@/lib/fetch-cycle";
import { buildPeriodList } from "@/lib/periods";
import { categoryColor } from "@/lib/category-color";
import { deleteRule, updateRule } from "./rules/actions";
import { AddRuleForm } from "./rules/add-rule-form";
import { CategoryEditButtons } from "./category-edit-buttons";
import { TransactionsSection } from "./transactions-section";

export const revalidate = 0;

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: categoryId } = await params;

  const [category] = await sql`SELECT * FROM categories WHERE id = ${categoryId}`;
  if (!category) redirect("/categories");

  const { start, end, key } = await fetchCurrentCycle();
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const periods = buildPeriodList(startStr, endStr, key);

  const [rules, transactions, categoriesRows, accountsRows] = await Promise.all([
    sql`SELECT * FROM category_rules WHERE category_id = ${categoryId} ORDER BY priority ASC, pattern ASC`,
    sql`
      SELECT t.*, json_build_object('name', a.name) AS accounts
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.category = ${category.name}
        AND t.date >= ${startStr} AND t.date <= ${endStr}
      ORDER BY t.date DESC
    `,
    sql`SELECT name FROM categories ORDER BY name ASC`,
    sql`SELECT id, name FROM accounts`,
  ]);

  const color = categoryColor(category.name, category.color);
  const typeLabel = category.type === "income" ? "Income" : "Expense";

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl shrink-0"
            style={{ backgroundColor: color }}
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {category.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  category.type === "income"
                    ? "bg-green-50 text-green-700 ring-green-600/20"
                    : "bg-slate-50 text-slate-600 ring-slate-500/10"
                }`}
              >
                {typeLabel}
              </span>
              {!category.is_active && (
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Inactive
                </span>
              )}
              {Number(category.monthly_budget) > 0 && (
                <span className="text-xs text-slate-500">
                  Budget:{" "}
                  {new Intl.NumberFormat("de-DE", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 2,
                  }).format(Number(category.monthly_budget))}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CategoryEditButtons category={category as any} />
          <Link
            href="/categories"
            className="h-9 rounded-xl px-4 text-xs font-medium text-slate-500 hover:text-slate-900 transition flex items-center"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Transactions */}
      <TransactionsSection
        categoryName={category.name}
        initialTransactions={transactions as any[]}
        periods={periods}
        currentCycleKey={key}
        categories={categoriesRows.map((c: any) => c.name)}
        accounts={accountsRows.map((a: any) => ({ id: a.id, name: a.name }))}
      />

      {/* Rules */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Auto-categorization Rules
          </h2>
          <p className="text-xs text-slate-500">
            Transactions whose description matches a keyword are automatically
            assigned to this category.
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-softer)] space-y-4">
          <AddRuleForm categoryId={categoryId} />
          <p className="text-xs text-slate-500">
            Lower priority wins. Example:{" "}
            <span className="font-mono">wolt</span>,{" "}
            <span className="font-mono">lieferando</span> → Eating Out.
          </p>
        </div>

        {rules.length > 0 && (
          <div className="rounded-xl bg-white shadow-[var(--shadow-softer)] overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500">
              <div className="col-span-5">Pattern</div>
              <div className="col-span-2">Priority</div>
              <div className="col-span-2">Active</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>
            <div className="divide-y divide-slate-100">
              {(rules as any[]).map((r) => (
                <div
                  key={r.id}
                  className="px-5 py-3 hover:bg-slate-50 transition-colors"
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
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        name="priority"
                        type="number"
                        defaultValue={r.priority}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
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
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
