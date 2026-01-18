"use client";

import * as React from "react";
import { archiveAccount, restoreAccount } from "./actions";
import { EditAccountModal, Account } from "./edit-modal";
import Link from "next/link";

export default function AccountsClient({ accounts }: { accounts: Account[] }) {
  const [showArchived, setShowArchived] = React.useState(false);
  const [selected, setSelected] = React.useState<Account | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const visibleAccounts = React.useMemo(() => {
    if (showArchived) return accounts;
    return accounts.filter((a) => (a.status ?? "active") !== "archived");
  }, [accounts, showArchived]);

  const openEdit = (acc: Account) => {
    setSelected(acc);
    setIsModalOpen(true);
  };

  const closeEdit = () => {
    setIsModalOpen(false);
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex items-center justify-end">
        <label className="flex items-center gap-2 text-xs text-slate-600 select-none">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="accent-slate-700"
          />
          Show archived
        </label>
      </div>

      {/* table */}
      <div className="rounded-[var(--radius)] bg-white shadow-[var(--shadow-softer)] overflow-hidden">
        {visibleAccounts.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No accounts found.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600">
                  Name
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600">
                  Type
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600">
                  Currency
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 text-right">
                  Start Balance
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleAccounts.map((acc) => {
                const isArchived = (acc.status ?? "active") === "archived";

                return (
                  <tr
                    key={acc.id}
                    className="group hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/accounts/${acc.id}`}
                          className="hover:underline underline-offset-4"
                        >
                          {acc.name}
                        </Link>

                        {isArchived && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Archived
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600">{acc.type}</td>
                    <td className="px-6 py-4 text-slate-600">{acc.currency}</td>

                    <td className="px-6 py-4 text-right font-medium tabular-nums text-slate-700">
                      {new Intl.NumberFormat("de-DE", {
                        style: "currency",
                        currency: acc.currency,
                      }).format(acc.initial_balance)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEdit(acc)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                        >
                          Edit
                        </button>

                        {isArchived ? (
                          <form action={restoreAccount.bind(null, acc.id)}>
                            <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition">
                              Restore
                            </button>
                          </form>
                        ) : (
                          <form action={archiveAccount.bind(null, acc.id)}>
                            <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition">
                              Archive
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <EditAccountModal
        account={selected}
        isOpen={isModalOpen}
        onClose={closeEdit}
      />
    </div>
  );
}
