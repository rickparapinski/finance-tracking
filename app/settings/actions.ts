// app/settings/actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type CycleConfig = {
  key: string; // "2026-01"
  start_date: string;
  end_date: string;
};

export async function upsertCycle(cycle: CycleConfig) {
  const { error } = await supabase
    .from("cycles")
    .upsert({
      key: cycle.key,
      start_date: cycle.start_date,
      end_date: cycle.end_date,
    })
    .select();

  if (error) throw new Error(error.message);

  // Refresh data across the app so the dashboard updates immediately
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function getCustomCycles() {
  const { data } = await supabase
    .from("cycles")
    .select("*")
    .order("key", { ascending: true });

  return data || [];
}
