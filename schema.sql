-- Finance Tracker Schema
-- Run this once on a fresh database (it is idempotent)

CREATE TABLE IF NOT EXISTS accounts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  currency      TEXT        NOT NULL DEFAULT 'EUR',
  type          TEXT        NOT NULL DEFAULT 'Checking',
  nature        TEXT        NOT NULL DEFAULT 'asset',
  initial_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  status        TEXT        NOT NULL DEFAULT 'active',
  color         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  type          TEXT        DEFAULT 'expense',
  color         TEXT,
  monthly_budget DECIMAL(12,2) DEFAULT 0,
  is_active     BOOLEAN     DEFAULT true,
  sort_order    INT         DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS category_rules (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       UUID    REFERENCES categories(id) ON DELETE CASCADE,
  pattern           TEXT    NOT NULL,
  match_type        TEXT    DEFAULT 'contains',
  priority          INT     DEFAULT 100,
  is_case_sensitive BOOLEAN DEFAULT false,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        UUID        REFERENCES accounts(id) ON DELETE CASCADE,
  date              DATE        NOT NULL,
  amount            DECIMAL(12,2) NOT NULL,
  amount_eur        DECIMAL(12,2),
  description       TEXT,
  category          TEXT        DEFAULT 'Uncategorized',
  original_currency TEXT        DEFAULT 'EUR',
  is_manual         BOOLEAN     DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cycles (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT  NOT NULL UNIQUE,
  start_date  DATE  NOT NULL,
  end_date    DATE  NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forecast_rules (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            UUID        REFERENCES accounts(id),
  category_id           UUID        REFERENCES categories(id),
  name                  TEXT        NOT NULL,
  type                  TEXT        NOT NULL,
  amount                DECIMAL(12,2) NOT NULL,
  currency              TEXT        DEFAULT 'EUR',
  start_date            DATE,
  end_date              DATE,
  frequency             TEXT,
  day_of_month          INT,
  installments_count    INT,
  is_active             BOOLEAN     DEFAULT true,
  source_transaction_id UUID        UNIQUE,
  category              TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forecast_instances (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id         UUID        REFERENCES forecast_rules(id) ON DELETE CASCADE,
  date            DATE        NOT NULL,
  amount          DECIMAL(12,2),
  override_amount DECIMAL(12,2),
  status          TEXT        DEFAULT 'projected',
  transaction_id  UUID        REFERENCES transactions(id),
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rule_id, date)
);

CREATE TABLE IF NOT EXISTS transaction_links (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  left_transaction_id   UUID REFERENCES transactions(id) ON DELETE CASCADE,
  right_transaction_id  UUID REFERENCES transactions(id) ON DELETE CASCADE,
  link_type             TEXT,
  amount                DECIMAL(12,2),
  note                  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Installment tracking on transactions (idempotent)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_index INT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_total INT;

-- Account extra fields (idempotent migrations)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS initial_balance_eur DECIMAL(12,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credit_limit      DECIMAL(12,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS interest_rate     DECIMAL(5,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS loan_original_amount DECIMAL(12,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS monthly_payment   DECIMAL(12,2);

-- Transaction tags (idempotent)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tag TEXT;
CREATE INDEX IF NOT EXISTS idx_transactions_tag ON transactions(tag);

-- Apple Wallet inbox / staged transactions
CREATE TABLE IF NOT EXISTS staged_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text      TEXT        NOT NULL,
  merchant      TEXT,
  amount        DECIMAL(12,2),
  currency      TEXT        DEFAULT 'EUR',
  source        TEXT        DEFAULT 'apple_wallet',
  status        TEXT        DEFAULT 'pending',   -- pending | confirmed | dismissed
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  processed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_staged_status ON staged_transactions(status);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date       ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_forecast_instances_rule ON forecast_instances(rule_id);
CREATE INDEX IF NOT EXISTS idx_category_rules_category ON category_rules(category_id);
