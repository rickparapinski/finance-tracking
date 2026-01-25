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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error } = await supabase
    .from("cycles")
    .upsert({
      key: cycle.key,
      start_date: cycle.start_date,
      end_date: cycle.end_date,
    })
    .select();

  if (error) throw new Error(error.message);

  // --- NEW: Clean up projected items so they regenerate with new dates ---
  // We delete all 'projected' budget instances.
  // Realized items (ones you marked as paid) are safe.
  await supabase
    .from("forecast_instances")
    .delete()
    .eq("status", "projected")
    .in(
      "rule_id",
      (
        await supabase.from("forecast_rules").select("id").eq("type", "budget")
      ).data?.map((r) => r.id) || [],
    );

  // Refresh data across the app
  revalidatePath("/");
  revalidatePath("/forecast");
  revalidatePath("/settings");
}

export async function getCustomCycles() {
  const { data } = await supabase
    .from("cycles")
    .select("*")
    .order("key", { ascending: true });

  return data || [];
}
