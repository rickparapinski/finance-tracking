import { sql } from "@/lib/db";
import { ForecastPlan } from "./ForecastPlan";

export const revalidate = 0;

function currentMonthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const monthKey = params.month ?? currentMonthKey();

  const [rules, categories] = await Promise.all([
    sql`SELECT * FROM forecast_rules WHERE is_active = true ORDER BY amount ASC`,
    sql`
      SELECT id, name, type, monthly_budget
      FROM categories
      WHERE monthly_budget IS NOT NULL AND monthly_budget != 0 AND is_active = true
      ORDER BY name ASC
    `,
  ]);

  return (
    <main className="min-h-screen bg-cream p-6 max-w-3xl mx-auto space-y-4">
      <ForecastPlan
        rules={rules as any[]}
        categories={categories as any[]}
        monthKey={monthKey}
      />
    </main>
  );
}
