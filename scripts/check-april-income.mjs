import postgres from "postgres";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const sql = postgres(env.DATABASE_URL, { ssl: false });

// All positive transactions in April, raw
const rows = await sql`
  SELECT t.date, t.description, t.amount, t.amount_eur, t.original_currency,
         t.category, a.name AS account
  FROM transactions t
  JOIN accounts a ON a.id = t.account_id
  WHERE t.date >= '2026-04-01' AND t.date <= '2026-04-30'
    AND COALESCE(t.amount_eur, t.amount) > 0
  ORDER BY t.date, COALESCE(t.amount_eur, t.amount) DESC
`;

console.log(`\n=== ALL POSITIVE TRANSACTIONS IN APRIL 2026 (${rows.length} total) ===\n`);
let total = 0;
for (const r of rows) {
  const eur = +r.amount_eur || +r.amount;
  total += eur;
  console.log(
    `  ${r.date}  ${r.account.padEnd(14)}  ${String(eur.toFixed(2)).padStart(10)}  [${r.category}]  ${r.description}`
  );
}
console.log(`\n  TOTAL positive in April: €${total.toFixed(2)}`);

// Also show March salary specifically
const march = await sql`
  SELECT t.date, t.description, t.amount, t.category, a.name AS account
  FROM transactions t
  JOIN accounts a ON a.id = t.account_id
  WHERE t.date >= '2026-03-01' AND t.date <= '2026-03-31'
    AND COALESCE(t.amount_eur, t.amount) > 0
    AND t.category = 'Salary'
  ORDER BY t.date DESC
`;

console.log(`\n=== SALARY TRANSACTIONS IN MARCH 2026 ===\n`);
for (const r of march) {
  console.log(`  ${r.date}  ${r.account.padEnd(14)}  €${Number(r.amount).toFixed(2)}  [${r.category}]  ${r.description}`);
}

await sql.end();
