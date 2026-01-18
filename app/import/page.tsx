"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

import { parseRevolut } from "@/lib/adapters/revolut";
import { parseNubank } from "@/lib/adapters/nubank";
import { parseTFBank } from "@/lib/adapters/tfbank";
import { saveTransactions } from "@/lib/db-loader";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ImportPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase
      .from("accounts")
      .select("*")
      .then(({ data }) => {
        if (data) setAccounts(data);
      });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccount) return;

    // 1. Get the "Selected" account just to know WHICH BANK adapter to use
    let targetAccount = accounts.find((a) => a.id === selectedAccount);
    if (!targetAccount) return;

    setUploading(true);
    setLog(["📂 Reading file..."]);

    try {
      let transactions = [];

      // === REVOLUT HANDLING ===
      if (targetAccount.name.includes("Revolut")) {
        transactions = await parseRevolut(file);
      }

      // === TF BANK HANDLING ===
      else if (targetAccount.name.includes("TF Bank")) {
        const formData = new FormData();
        formData.append("file", file);

        setLog((prev) => [...prev, "🚀 Parsing PDF on server..."]);

        // Call the server action directly
        transactions = await parseTFBank(formData);
      }

      // === NUBANK HANDLING (Smart Routing) ===
      else if (targetAccount.name.includes("Nubank")) {
        transactions = await parseNubank(file);

        // DETECT: Is this Checking or Card?
        // Our adapter sets category='Checking' for the checking CSV.
        const isCheckingFile =
          transactions.length > 0 && transactions[0].category === "Checking";

        // FIND the correct account in your list
        const correctName = isCheckingFile ? "Nubank Checking" : "Nubank Card";
        const smartAccount = accounts.find((a) => a.name === correctName);

        if (smartAccount) {
          targetAccount = smartAccount; // <--- OVERRIDE the user's selection
          setLog((prev) => [
            ...prev,
            `🤖 Smart Detect: Routing to '${correctName}'`,
          ]);
        } else {
          setLog((prev) => [
            ...prev,
            `⚠️ Warning: Could not find account '${correctName}'. using selected.`,
          ]);
        }
      } else {
        alert("No adapter found for this bank yet!");
        setUploading(false);
        return;
      }

      setLog((prev) => [
        ...prev,
        `🔎 Found ${transactions.length} transactions. Saving to ${targetAccount.name}...`,
      ]);

      // 3. Save to the CORRECT Account ID
      const result = await saveTransactions(targetAccount.id, transactions);

      setLog((prev) => [
        ...prev,
        `✅ DONE: Saved ${result.savedCount} new.`,
        `⏭️ Skipped ${result.duplicateCount} duplicates.`,
      ]);
    } catch (err) {
      console.error(err);
      setLog((prev) => [...prev, "❌ Error parsing file. Check console."]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-10 max-w-xl mx-auto font-sans">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Import
        </h1>
        <p className="text-sm text-slate-500">
          Upload a CSV/PDF and we’ll route it to the correct adapter.
        </p>
      </header>
      <section className="rounded-[var(--radius)] bg-white p-6 shadow-[var(--shadow-softer)] space-y-5">
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Account
          </label>
          <select
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="">-- Choose Account --</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency})
              </option>
            ))}
          </select>
        </div>

        <div
          className={[
            "rounded-[var(--radius)] border border-dashed border-slate-200 bg-slate-50/40 p-8",
            "text-center transition",
            !selectedAccount || uploading ? "opacity-60" : "hover:bg-slate-50",
          ].join(" ")}
        >
          <input
            type="file"
            accept=".csv,.pdf"
            disabled={!selectedAccount || uploading}
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-600
  file:mr-4 file:h-10 file:px-4 file:rounded-xl
  file:border file:border-slate-200
  file:bg-white file:text-slate-700
  hover:file:bg-slate-50
  file:font-medium"
          />
        </div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Import log</h2>
          {uploading && (
            <span className="text-xs font-medium text-emerald-600 animate-pulse">
              Processing…
            </span>
          )}
        </div>

        <div className="min-h-[120px] space-y-2">
          {log.length === 0 ? (
            <p className="text-sm text-slate-500">
              Choose an account and upload a file to begin.
            </p>
          ) : (
            log.map((l, i) => (
              <p
                key={i}
                className="text-slate-700 font-mono text-sm border-b border-slate-100 py-1"
              >
                {l}
              </p>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
