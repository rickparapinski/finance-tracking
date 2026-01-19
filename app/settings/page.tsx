import { getCustomCycles } from "./actions";
import { CycleManager } from "./cycle-manager";

export const revalidate = 0;

export default async function SettingsPage() {
  const cycles = await getCustomCycles();

  return (
    <main className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-sm text-slate-500">
          Manage system configuration and defaults.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <CycleManager existingCycles={cycles} />

        {/* Placeholder for future settings */}
        <div className="p-6 border rounded-xl border-dashed border-slate-200 text-center text-slate-400 text-sm">
          Future settings (Categories, Rules) will go here.
        </div>
      </div>
    </main>
  );
}
