"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { createQuickTransaction, getSpotRate } from "@/app/actions/quick-add";

type AccountOption = { id: string; name: string; currency: string };

interface QuickAddFormProps {
  accounts: AccountOption[];
  categories: string[];
  /** When provided the account selector is hidden and this account is used */
  defaultAccountId?: string;
  /** Called after a transaction is successfully created */
  onSuccess?: () => Promise<void> | void;
}

export function QuickAddForm({ accounts, categories, defaultAccountId, onSuccess }: QuickAddFormProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [calOpen, setCalOpen] = useState(false);
  const [accountId, setAccountId] = useState(
    defaultAccountId ?? accounts[0]?.id ?? "",
  );
  const [amount, setAmount] = useState("");
  const [eurPreview, setEurPreview] = useState<number | null>(null);
  const [spotRate, setSpotRate] = useState<number | null>(null);
  const [category, setCategory] = useState("Uncategorized");
  const [counterpartId, setCounterpartId] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentIndex, setInstallmentIndex] = useState("1");
  const [installmentTotal, setInstallmentTotal] = useState("2");
  const [isPending, startTransition] = useTransition();
  const counterpartRef = useRef<HTMLSelectElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const currency = selectedAccount?.currency ?? "EUR";
  const isTransfer = category === "Transfer";
  const otherAccounts = accounts.filter((a) => a.id !== accountId);

  // Fetch spot rate when currency changes
  useEffect(() => {
    if (currency === "EUR") {
      setSpotRate(1);
      setEurPreview(null);
      return;
    }
    setSpotRate(null);
    startTransition(async () => {
      const rate = await getSpotRate(currency);
      setSpotRate(rate);
    });
  }, [currency]);

  // Recompute EUR preview when amount or rate changes
  useEffect(() => {
    if (currency === "EUR" || spotRate == null) {
      setEurPreview(null);
      return;
    }
    const n = parseFloat(amount);
    if (!Number.isNaN(n) && n !== 0) {
      setEurPreview(parseFloat((n / spotRate).toFixed(2)));
    } else {
      setEurPreview(null);
    }
  }, [amount, spotRate, currency]);

  // Focus counterpart select when Transfer is chosen
  useEffect(() => {
    if (isTransfer) counterpartRef.current?.focus();
  }, [isTransfer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    fd.set("date", format(date, "yyyy-MM-dd"));
    if (isInstallment) {
      fd.set("installment_index", installmentIndex);
      fd.set("installment_total", installmentTotal);
    }
    startTransition(async () => {
      await createQuickTransaction(fd);
      // Reset fields
      setAmount("");
      setCategory("Uncategorized");
      setCounterpartId("");
      setIsInstallment(false);
      setInstallmentIndex("1");
      setInstallmentTotal("2");
      setDate(new Date());
      formRef.current?.reset();
      await onSuccess?.();
    });
  };

  const fmtEur = (n: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

  const fmtCur = (n: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(n);

  const labelCls = "block text-[10px] text-zinc-400 uppercase font-bold mb-1";
  const inputCls =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";

  return (
    <div className="rounded-[var(--radius)] bg-white p-5 shadow-[var(--shadow-softer)]">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Add</h3>
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <input type="hidden" name="account_id" value={accountId} />

        {/* Date picker */}
        <div>
          <label className={labelCls}>Date</label>
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-10 min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 flex items-center gap-2 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <CalendarIcon size={14} className="text-slate-400 shrink-0" />
                {format(date, "MMM d, yyyy")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { if (d) { setDate(d); setCalOpen(false); } }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Description */}
        <div className="flex-1 min-w-[180px]">
          <label className={labelCls}>Description</label>
          <input
            name="description"
            required
            placeholder="e.g. Groceries"
            className={inputCls}
          />
        </div>

        {/* Category */}
        <div className="w-44">
          <label className={labelCls}>Category</label>
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            <option value="Uncategorized">Uncategorized</option>
            {categories
              .filter((c) => c && c !== "Uncategorized")
              .map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
          </select>
        </div>

        {/* Account selector — hidden when defaultAccountId is set */}
        {!defaultAccountId && (
          <div className="w-44">
            <label className={labelCls}>Account</label>
            <select
              name="account_id_display"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className={inputCls}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Amount + EUR preview */}
        <div>
          <label className={labelCls}>
            Amount
            {currency !== "EUR" && (
              <span className="ml-1 normal-case text-indigo-500 font-semibold">({currency})</span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <input
              name="amount"
              type="number"
              step="0.01"
              required
              placeholder="-0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 w-32 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            {currency !== "EUR" && eurPreview != null && (
              <span className="text-xs text-slate-500 whitespace-nowrap">
                ≈ {fmtEur(eurPreview)}
              </span>
            )}
          </div>
        </div>

        {/* Installment toggle + fields */}
        <div className="flex items-end gap-2">
          <div className="flex flex-col justify-end h-10 pb-2">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-500 font-medium">
              <input
                type="checkbox"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
                className="accent-indigo-600 h-3.5 w-3.5"
              />
              Installment
            </label>
          </div>
          {isInstallment && (
            <>
              <div>
                <label className={labelCls}>Current #</label>
                <input
                  type="number"
                  min="1"
                  value={installmentIndex}
                  onChange={(e) => setInstallmentIndex(e.target.value)}
                  className="h-10 w-16 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 text-center"
                />
              </div>
              <span className="mb-2 text-slate-400 text-sm">/</span>
              <div>
                <label className={labelCls}>Total</label>
                <input
                  type="number"
                  min="1"
                  value={installmentTotal}
                  onChange={(e) => setInstallmentTotal(e.target.value)}
                  className="h-10 w-16 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 text-center"
                />
              </div>
              {parseInt(installmentIndex) < parseInt(installmentTotal) && (
                <p className="mb-2 text-[10px] text-indigo-500 self-end">
                  {parseInt(installmentTotal) - parseInt(installmentIndex)} future installment{parseInt(installmentTotal) - parseInt(installmentIndex) > 1 ? "s" : ""} will be forecasted
                </p>
              )}
            </>
          )}
        </div>

        {/* Transfer counterpart */}
        {isTransfer && (
          <div className="w-44">
            <label className={labelCls + " text-amber-600"}>Transfer to</label>
            <select
              ref={counterpartRef}
              name="counterpart_account_id"
              value={counterpartId}
              onChange={(e) => setCounterpartId(e.target.value)}
              className={`${inputCls} ring-2 ring-amber-400 border-amber-400`}
            >
              <option value="">— select account —</option>
              {otherAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-xl bg-emerald-500 px-5 text-sm font-medium text-white shadow-[var(--shadow-softer)] hover:opacity-90 transition disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add"}
        </button>
      </form>
    </div>
  );
}
