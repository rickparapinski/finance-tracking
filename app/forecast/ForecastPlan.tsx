"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarRange } from "pixelarticons/react/CalendarRange";
import { RuleModal } from "./RuleModal";
import { deleteForecastRule } from "./actions";
import { formatCurrency } from "@/lib/finance-utils";

type Rule = {
  id: string;
  name: string;
  amount: number;
  type: string;
  start_date: string;
  end_date?: string | null;
  installments_count?: number | null;
};

type BudgetCategory = {
  id: string;
  name: string;
  type: string;
  monthly_budget: number;
};

// ── Month helpers ─────────────────────────────────────────────────────────────

function monthKeyToYM(key: string) {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m };
}

function dateToMonthKey(date: string) {
  return date.slice(0, 7);
}

function monthDiff(fromKey: string, toKey: string) {
  const { year: fy, month: fm } = monthKeyToYM(fromKey);
  const { year: ty, month: tm } = monthKeyToYM(toKey);
  return (ty - fy) * 12 + (tm - fm);
}

function prevMonthKey(key: string) {
  const { year, month } = monthKeyToYM(key);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

function nextMonthKey(key: string) {
  const { year, month } = monthKeyToYM(key);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function formatMonthKey(key: string) {
  const { year, month } = monthKeyToYM(key);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isRuleActiveForMonth(rule: Rule, monthKey: string): boolean {
  const startKey = dateToMonthKey(rule.start_date);
  if (rule.type === "recurring" || rule.type === "income") {
    if (monthKey < startKey) return false;
    if (rule.end_date && monthKey > dateToMonthKey(rule.end_date)) return false;
    return true;
  }
  if (rule.type === "installment") {
    const idx = monthDiff(startKey, monthKey);
    return idx >= 0 && idx < (rule.installments_count ?? 0);
  }
  return false;
}

function installmentProgress(rule: Rule, monthKey: string) {
  const startKey = dateToMonthKey(rule.start_date);
  const idx = monthDiff(startKey, monthKey);
  return { current: idx + 1, total: rule.installments_count ?? 1 };
}

// ── Components ────────────────────────────────────────────────────────────────

const amtCls = (n: number) =>
  n > 0.005
    ? "font-mono tabular-nums text-emerald-700"
    : n < -0.005
      ? "font-mono tabular-nums text-rose-700"
      : "font-mono tabular-nums text-ink/40";

function RuleRow({
  rule,
  monthKey,
  onEdit,
  onDelete,
}: {
  rule: Rule;
  monthKey: string;
  onEdit: (rule: Rule) => void;
  onDelete: (id: string) => void;
}) {
  const progress =
    rule.type === "installment" ? installmentProgress(rule, monthKey) : null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-ink/5 last:border-0 group">
      <span className="flex-1 font-mono text-sm text-ink truncate">{rule.name}</span>
      {progress && (
        <span className="font-mono text-[10px] text-ink/40 shrink-0">
          {progress.current}/{progress.total}
        </span>
      )}
      <span className={`${amtCls(Number(rule.amount))} text-sm shrink-0`}>
        {formatCurrency(Number(rule.amount))}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(rule)}
          className="grid size-6 place-items-center text-ink/30 hover:text-ink transition-none"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={() => onDelete(rule.id)}
          className="grid size-6 place-items-center text-ink/30 hover:text-rose-600 transition-none"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  total,
  children,
  empty,
}: {
  title: string;
  total: number;
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs text-ink-soft">{title}</h2>
        <span className={`${amtCls(total)} text-xs`}>{formatCurrency(total)}</span>
      </div>
      <div className="border-2 border-ink bg-surface shadow-[4px_4px_0_#1F1F1F]">
        {children ?? (
          <p className="px-4 py-3 font-mono text-xs text-ink/30">{empty}</p>
        )}
      </div>
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ForecastPlan({
  rules,
  categories,
  monthKey,
}: {
  rules: Rule[];
  categories: BudgetCategory[];
  monthKey: string;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  const activeRules = rules.filter((r) => isRuleActiveForMonth(r, monthKey));
  const income = activeRules.filter((r) => r.type === "income");
  const fixed = activeRules.filter((r) => r.type === "recurring");
  const installments = activeRules.filter((r) => r.type === "installment");
  const budgets = categories.filter((c) => c.type === "expense");

  const totalIncome = income.reduce((s, r) => s + Number(r.amount), 0);
  const totalFixed = fixed.reduce((s, r) => s + Number(r.amount), 0);
  const totalInstallments = installments.reduce((s, r) => s + Number(r.amount), 0);
  const totalBudgets = budgets.reduce((s, c) => s + Number(c.monthly_budget), 0);
  const freeMoney = totalIncome + totalFixed + totalInstallments + totalBudgets;

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this rule from the plan?")) return;
    await deleteForecastRule(id);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditingRule(null);
    router.refresh();
  };

  const prev = prevMonthKey(monthKey);
  const next = nextMonthKey(monthKey);

  return (
    <>
      <RuleModal
        isOpen={modalOpen}
        onClose={handleClose}
        ruleToEdit={editingRule}
        defaultMonth={monthKey}
      />

      <PageHeader
        title="forecast"
        meta="monthly budget plan"
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/forecast?month=${prev}`}
              className="grid size-8 place-items-center border-2 border-ink bg-surface text-ink-soft shadow-[2px_2px_0_#1F1F1F] hover:bg-lime hover:text-ink hover:shadow-[1px_1px_0_#1F1F1F] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-none"
              title="previous month"
            >
              <span className="font-pixel text-[11px]">←</span>
            </Link>
            <span className="font-mono text-xs text-ink whitespace-nowrap">
              {formatMonthKey(monthKey)}
            </span>
            <Link
              href={`/forecast?month=${next}`}
              className="grid size-8 place-items-center border-2 border-ink bg-surface text-ink-soft shadow-[2px_2px_0_#1F1F1F] hover:bg-lime hover:text-ink hover:shadow-[1px_1px_0_#1F1F1F] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-none"
              title="next month"
            >
              <span className="font-pixel text-[11px]">→</span>
            </Link>
            <div className="h-6 w-px bg-ink/15 mx-1" />
            <button
              onClick={() => { setEditingRule(null); setModalOpen(true); }}
              className="h-8 px-3 flex items-center gap-1 bg-lime border-2 border-ink text-ink font-pixel text-[11px] shadow-[4px_4px_0_#1F1F1F] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1F1F1F] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-none"
            >
              + add rule
            </button>
          </div>
        }
      />

      {/* income */}
      <Section title="income" total={totalIncome} empty="no income rules">
        {income.length > 0
          ? income.map((r) => (
              <RuleRow key={r.id} rule={r} monthKey={monthKey} onEdit={handleEdit} onDelete={handleDelete} />
            ))
          : null}
      </Section>

      {/* fixed costs */}
      <Section title="fixed costs" total={totalFixed} empty="no fixed rules — add one">
        {fixed.length > 0
          ? fixed.map((r) => (
              <RuleRow key={r.id} rule={r} monthKey={monthKey} onEdit={handleEdit} onDelete={handleDelete} />
            ))
          : null}
      </Section>

      {/* installments */}
      {installments.length > 0 && (
        <Section title="installments" total={totalInstallments}>
          {installments.map((r) => (
            <RuleRow key={r.id} rule={r} monthKey={monthKey} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </Section>
      )}

      {/* variable budgets */}
      <Section title="variable budgets" total={totalBudgets} empty="no category budgets set">
        {budgets.length > 0 ? (
          <>
            {budgets.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-ink/5 last:border-0">
                <span className="flex-1 font-mono text-sm text-ink truncate">{c.name}</span>
                <span className={`${amtCls(Number(c.monthly_budget))} text-sm`}>
                  {formatCurrency(Number(c.monthly_budget))}
                </span>
              </div>
            ))}
            <div className="px-4 py-2 border-t border-ink/10 bg-ink/[0.02]">
              <p className="font-mono text-[10px] text-ink/40">
                budgets from categories →{" "}
                <a href="/categories" className="underline underline-offset-2 hover:text-ink transition-none">
                  manage
                </a>
              </p>
            </div>
          </>
        ) : null}
      </Section>

      {/* free money */}
      <div className="border-2 border-ink bg-surface shadow-[4px_4px_0_#1F1F1F] px-4 py-4 flex items-center justify-between">
        <span className="font-pixel text-sm text-ink">free money</span>
        <span
          className={`font-pixel text-xl ${
            freeMoney > 0.005
              ? "text-emerald-700"
              : freeMoney < -0.005
                ? "text-rose-700"
                : "text-ink/40"
          }`}
        >
          {formatCurrency(freeMoney)}
        </span>
      </div>
    </>
  );
}
