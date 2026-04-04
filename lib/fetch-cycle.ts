"use server";
import { sql } from "@/lib/db";
import { getCycleKeyForDate, getCurrentCycle } from "./finance-utils";

export async function fetchCurrentCycle() {
  const now = new Date();
  const nowStr = now.toISOString().split("T")[0];

  const [activeCycle] = await sql`
    SELECT * FROM cycles
    WHERE start_date <= ${nowStr} AND end_date >= ${nowStr}
    LIMIT 1
  `;

  if (activeCycle) {
    const start = new Date(activeCycle.start_date);
    const end = new Date(activeCycle.end_date);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end, key: activeCycle.key };
  }

  const defaultCycle = getCurrentCycle();
  return { ...defaultCycle, key: getCycleKeyForDate(now) };
}
