"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { NahBubble } from "./nah-bubble";

const btnSec =
  "h-7 bg-surface border-2 border-ink text-ink font-mono text-[10px] px-2 " +
  "shadow-[3px_3px_0_#1F1F1F] hover:bg-cream-soft " +
  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#1F1F1F] " +
  "disabled:opacity-30 disabled:pointer-events-none transition-none";

const btnDark =
  "h-8 px-3 bg-ink text-cream-soft border-2 border-ink font-mono text-[11px] " +
  "shadow-[4px_4px_0_rgba(31,31,31,0.4)] hover:bg-ink/80 " +
  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none " +
  "disabled:opacity-40 disabled:pointer-events-none transition-none";

const btnCancel =
  "h-8 px-3 bg-surface border-2 border-ink text-ink font-mono text-[11px] " +
  "shadow-[4px_4px_0_#1F1F1F] hover:bg-cream-soft " +
  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F] " +
  "transition-none";

interface DeleteTransactionButtonProps {
  /** Pre-bound server action: deleteTransaction.bind(null, id) */
  action: () => Promise<void>;
}

export function DeleteTransactionButton({ action }: DeleteTransactionButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending]       = useState(false);

  return (
    <>
      <button onClick={() => setConfirming(true)} className={btnSec}>
        del
      </button>

      {confirming && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border-2 border-ink shadow-[4px_4px_0_#1F1F1F] p-6 max-w-sm w-full space-y-5">
            <NahBubble expression="skeptical" nahSize={56}>
              delete this transaction?<br />this can&rsquo;t be undone.
            </NahBubble>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirming(false)} className={btnCancel}>
                cancel
              </button>
              <button
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  try { await action(); } finally { setPending(false); setConfirming(false); }
                }}
                className={btnDark}
              >
                {pending ? "deleting…" : "delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
