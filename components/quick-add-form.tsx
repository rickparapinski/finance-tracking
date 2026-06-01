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

// ── Design-system tokens ───────────────────────────────────────────────────────
const labelCls = "block text-xs font-mono text-ink-soft mb-1";
const inputCls =
  "h-9 w-full rounded-md border-2 border-ink bg-white px-3 text-sm text-ink " +
  "placeholder:text-ink/30 focus:outline-none focus:border-ink/70 transition-none";

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
      formRef.current?.reset();
      await onSuccess?.();
    });
  };

  const fmtEur = (n: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

  return (
    <>
      <h3 className="font-mono text-sm text-ink font-medium mb-4">quick add</h3>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <input type="hidden" name="account_id" value={accountId} />

        {/* Date picker */}
        <div>
          <label className={labelCls}>date</label>
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-9 min-w-[140px] rounded-md border-2 border-ink bg-white px-3 text-sm text-ink flex items-center gap-2 hover:bg-cream-soft focus:outline-none transition-none"
              >
                <CalendarIcon size={13} className="text-ink/40 shrink-0" />
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
          <label className={labelCls}>description</label>
          <input
            name="description"
            required
            placeholder="e.g. groceries"
            className={inputCls}
          />
        </div>

        {/* Category */}
        <div className="w-44">
          <label className={labelCls}>category</label>
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
            <label className={labelCls}>account</label>
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
            amount
            {currency !== "EUR" && (
              <span className="ml-1 font-mono text-ink/50">({currency})</span>
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
              className="h-9 w-32 rounded-md border-2 border-ink bg-white px-3 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/70 transition-none"
            />
            {currency !== "EUR" && eurPreview != null && (
              <span className="font-mono text-xs text-ink/40 whitespace-nowrap">
                ≈ {fmtEur(eurPreview)}
              </span>
            )}
          </div>
        </div>

        {/* Installment toggle + fields */}
        <div className="flex items-end gap-2">
          <div className="flex flex-col justify-end h-9 pb-1">
            <label className="flex items-center gap-1.5 cursor-pointer select-none font-mono text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
                className="accent-ink h-3.5 w-3.5"
              />
              installment
            </label>
          </div>
          {isInstallment && (
            <>
              <div>
                <label className={labelCls}>current #</label>
                <input
                  type="number"
                  min="1"
                  value={installmentIndex}
                  onChange={(e) => setInstallmentIndex(e.target.value)}
                  className="h-9 w-16 rounded-md border-2 border-ink bg-white px-3 text-sm text-ink focus:outline-none focus:border-ink/70 transition-none text-center"
                />
              </div>
              <span className="mb-1 font-mono text-sm text-ink/30">/</span>
              <div>
                <label className={labelCls}>total</label>
                <input
                  type="number"
                  min="1"
                  value={installmentTotal}
                  onChange={(e) => setInstallmentTotal(e.target.value)}
                  className="h-9 w-16 rounded-md border-2 border-ink bg-white px-3 text-sm text-ink focus:outline-none focus:border-ink/70 transition-none text-center"
                />
              </div>
              {parseInt(installmentIndex) < parseInt(installmentTotal) && (
                <p className="mb-1 font-mono text-[10px] text-ink/40 self-end">
                  {parseInt(installmentTotal) - parseInt(installmentIndex)} future{" "}
                  installment{parseInt(installmentTotal) - parseInt(installmentIndex) > 1 ? "s" : ""} forecasted
                </p>
              )}
            </>
          )}
        </div>

        {/* Transfer counterpart */}
        {isTransfer && (
          <div className="w-44">
            <label className={labelCls + " text-lime"}>transfer to</label>
            <select
              ref={counterpartRef}
              name="counterpart_account_id"
              value={counterpartId}
              onChange={(e) => setCounterpartId(e.target.value)}
              className="h-9 w-full rounded-md border-2 border-lime bg-white px-3 text-sm text-ink focus:outline-none transition-none"
            >
              <option value="">— select account —</option>
              {otherAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Add */}
        <button
          type="submit"
          disabled={isPending}
          className="h-9 rounded-md bg-[#C5F03A] border-2 border-ink px-5 font-mono text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50 transition-none"
        >
          {isPending ? "adding…" : "add"}
        </button>
      </form>
    </>
  );
}
