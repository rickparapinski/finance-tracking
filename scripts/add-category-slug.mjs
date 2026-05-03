/**
 * One-time migration: add slug column to categories and populate from name.
 * Run with: node scripts/add-category-slug.mjs
 */
import postgres from "postgres";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const sql = postgres(env.DATABASE_URL, { ssl: false });

function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

console.log("Adding slug column...");
await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug TEXT`;

const cats = await sql`SELECT id, name FROM categories ORDER BY name ASC`;

console.log(`Populating slugs for ${cats.length} categories...`);
for (const cat of cats) {
  const slug = toSlug(cat.name);
  await sql`UPDATE categories SET slug = ${slug} WHERE id = ${cat.id}`;
  console.log(`  "${cat.name}" → "${slug}"`);
}

await sql.end();
console.log("Done!");
