# Finance Tracker — CLAUDE.md

Personal finance tracker (Next.js + PostgreSQL) for one user. Tracks multi-currency accounts, imports bank data (Nubank/Revolut/TF Bank), auto-categorizes transactions, and has a Claude-powered financial advisor. All amounts stored in original currency + EUR equivalent. Billing cycle defaults to 25th of prior month → 27th of current month (Dec: 19th–27th), overridable via `cycles` table.

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Database | PostgreSQL via `postgres` npm package (direct, no ORM) |
| Styling | Tailwind CSS 4 |
| Tables | TanStack React Table 8 |
| UI | Radix UI (headless), Lucide icons |
| CSV/PDF | PapaParse (CSV), pdf-parse (TF Bank PDFs) |
| Currency | Frankfurter API (historical EUR rates); BRL fallback rate 6.0 |
| AI | Anthropic SDK — `claude-sonnet-4-5`, streamed, ephemeral cache |
| Auth | Cookie-based (HMAC-SHA256); 30-day; enforced in `middleware.ts` |
| Bots | Telegram bot (`/api/telegram`), Apple Wallet webhook (`/api/ingest`) |

---

## Database Schema

**`accounts`** — id, name, currency, type (`Checking|Savings|Credit Card|Loan`), nature (`asset|liability`), initial_balance, initial_balance_eur, color, credit_limit, interest_rate, loan_original_amount, monthly_payment, status (`active|archived`)

**`transactions`** — id, account_id, date, amount, amount_eur, description, category, original_currency, is_manual, installment_index, installment_total, tag

**`categories`** — id, name, type (`expense|income`), color, monthly_budget, is_active, slug, sort_order

**`category_rules`** — id, category_id, pattern, match_type (`contains`), priority, is_case_sensitive, is_active

**`cycles`** — id, key (unique e.g. `"2026-03"`), start_date, end_date *(overrides default cycle calc)*

**`transaction_links`** — id, left_transaction_id, right_transaction_id, link_type (`transfer|settlement|statement_payment|refund|allocation`), amount, note

**`staged_transactions`** — id, raw_text, merchant, amount, currency, source (`apple_wallet`), status (`pending|confirmed|dismissed`)

**`forecast_rules`** — id, account_id, category_id, name, type (`recurring|one-time`), amount, currency, frequency, day_of_month, installments_count, is_active, source_transaction_id

**`forecast_instances`** — id, rule_id, date, amount, override_amount, status (`projected|confirmed`), transaction_id, note

Schema source: `schema.sql` (idempotent, safe to re-run).

---

## Key Source Files

| File | Purpose |
|------|---------|
| `lib/db.ts` | PostgreSQL singleton (custom DATE type handler) |
| `lib/db-loader.ts` | Import pipeline: fetch rates → categorize → dedup → bulk insert |
| `lib/categorize.ts` | Rule-based categorization (pattern match, priority order) |
| `lib/enricher.ts` | Fetch EUR rates from Frankfurter API for a date range |
| `lib/fetch-cycle.ts` | Current cycle detection (DB override → standard 25th rule) |
| `lib/finance-utils.ts` | Cycle date calc, currency conversion helpers |
| `lib/installment.ts` | Regex: detects "Parcela 2/3" style installments |
| `lib/adapters/nubank.ts` | Nubank CSV → `NormalizedTransaction[]` (CC vs checking) |
| `lib/adapters/revolut.ts` | Revolut CSV → `NormalizedTransaction[]` (completed only) |
| `lib/adapters/tfbank.ts` | TF Bank PDF → `NormalizedTransaction[]` |
| `lib/adapters/types.ts` | `NormalizedTransaction`, `Transaction` interfaces |
| `middleware.ts` | Auth enforcement; public: `/login`, `/api/ingest`, `/api/telegram` |
| `app/layout.tsx` | Root layout: queries all accounts + inbox count on every render |
| `app/page.tsx` | Dashboard: net worth, cycle stats, spending, bills |
| `app/transactions/actions.ts` | CRUD + bulk ops (assign category, set tag) |
| `app/transactions/edit-modal.tsx` | Edit modal: amount, EUR equivalent override (non-EUR), category, tag, transfer counterpart |
| `app/actions/quick-add.ts` | Quick-add server action: creates tx + cross-currency transfer counterpart via spot rate |
| `app/transactions/page.tsx` | Transaction table (TanStack, filters, bulk edit) |
| `app/categories/actions.ts` | Category CRUD |
| `app/categories/[id]/rules/actions.ts` | Category rule CRUD + apply-to-existing |
| `app/import/page.tsx` | CSV/PDF upload UI; routes file to correct adapter |
| `app/inbox/actions.ts` | Confirm/dismiss staged Apple Wallet transactions |
| `app/advisor/prompt.ts` | Builds Claude system prompt (accounts, spending, budgets, ledger) |
| `app/api/advisor/route.ts` | Stream Claude response; ephemeral cache on system prompt |
| `app/api/ingest/route.ts` | Parse Apple Wallet push text → staged_transaction |
| `app/api/telegram/route.ts` | Telegram bot webhook dispatcher |

---

## Core Flows

**Import (CSV/PDF)**
Upload → adapter normalizes → `lib/db-loader.ts::saveTransactions()`:
1. Fetch EUR rates for date range (Frankfurter)
2. Load category rules from DB
3. Match rules → assign category
4. Detect installments (regex)
5. Dedup: `(date, amount, description)` key
6. Bulk insert (500-row chunks)
7. `revalidatePath()` on dashboard + sidebar

**Transaction CRUD**
`app/transactions/actions.ts` — `createManualTransaction`, `updateTransaction` (recalculates EUR if amount changes), `deleteTransaction`, `bulkAssignCategory`, `bulkSetTag`. All call `revalidatePath()`.

**Transfer (quick-add)**
`app/actions/quick-add.ts::createQuickTransaction` — when category = "Transfer" and `counterpart_account_id` is set, inserts a mirrored transaction in the counterpart account and creates a `transaction_links` row. Cross-currency: for EUR→foreign, fetches today's spot rate to estimate native target amount; for foreign→EUR, uses `amount_eur` directly. `amount_eur` on the counterpart always mirrors the source's EUR equivalent (negated).

**Categorization**
Priority order: (1) imported category if non-empty → (2) highest-priority matching rule → (3) "Uncategorized". Pattern match is case-insensitive substring by default.

**Apple Wallet Ingestion**
`POST /api/ingest` (requires `x-ingest-secret` header) → parses merchant + amount → inserts `staged_transactions`. User confirms in `/inbox` → becomes real transaction.

**Telegram Bot**
`POST /api/telegram` → parses "€12 Coffee" or "€50 yesterday" → auto-categorizes → inserts as manual transaction.

**Financial Advisor**
`/advisor` → `POST /api/advisor` → system prompt from `buildSystemPrompt()` (accounts, cycle spending, budgets, top transactions, recurring rules, full ledger) → streamed Claude response. Ephemeral cache cuts follow-up cost ~10×.

**Balance Calculation**
`account.balance = initial_balance_eur + SUM(transactions.amount_eur)`. Calculated at page load in `app/layout.tsx`.

**Cycle Detection**
`fetchCurrentCycle()`: query `cycles` table by key first; fall back to 25th-of-prior-month rule. December exception: 19th–27th.

---

## API Routes

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/advisor` | Cookie | Stream Claude financial advice |
| `POST /api/ingest` | `x-ingest-secret` header | Apple Wallet text ingestion |
| `POST /api/telegram` | Telegram token (env) | Telegram bot webhook |

---

## Environment Variables (`.env.local`)

`DATABASE_URL` · `ANTHROPIC_API_KEY` · `APP_PASSWORD` · `APP_SECRET` · `INGEST_SECRET` · `TELEGRAM_BOT_TOKEN` · Supabase keys (legacy, not actively used)

---

## Conventions

- **No ORM** — raw SQL via `postgres` tagged template literals
- **EUR normalization** — every transaction has `amount_eur`; dashboard/reports use this
- **Server Actions** — mutations via Next.js server actions, not REST; each calls `revalidatePath()`
- **`@/*` alias** — root-relative imports throughout
- **`next.config.ts`** — `output: 'standalone'`; `pdf-parse` + `postgres` marked as server externals; TS build errors ignored
- **Installment format** — Brazilian "Parcela N/M" parsed at import time, stored as `installment_index` / `installment_total`
- **Transfer linking** — use `transaction_links` table to pair debit/credit sides; don't duplicate amount

---

## Scripts (`/scripts/`)

- `add-category-slug.mjs` — One-time migration: added `slug` column to categories
- `check-april-income.mjs` — Audit: lists positive transactions for April 2026

Both read `.env.local` directly and connect to PostgreSQL.

---

## Deployment

Production runs in an LXC container (Proxmox) at `192.168.178.50` under `/opt/finance-tracker`, served via Docker Compose (`app` + `db` services).

To deploy after merging to `main`:

```bash
npm run deploy
```

This SSHes into the LXC, pulls `main`, rebuilds the Docker image, and restarts the app container. The `db` container is never restarted. SSH key (`~/.ssh/id_ed25519`) is already authorized on the LXC.
