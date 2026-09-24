-- ========================================================================
-- WORKER SUPPLY & SUBLEDGER SYSTEM - SCHEMA DEFINITION (PostgreSQL 17+)
-- Version 2.0
-- ========================================================================

CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  currency char(3) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  cutover_date date NOT NULL,
  closed_through date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  auth_issuer text NOT NULL,
  auth_subject text NOT NULL,
  role text NOT NULL CHECK (role IN ('OWNER','ACCOUNTANT','SUPERVISOR')),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, auth_issuer, auth_subject)
);

CREATE TABLE workers (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  phone text,
  skill text,
  default_wage numeric(14,2) NOT NULL CHECK (default_wage > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, code)
);

CREATE TABLE customers (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  phone text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, code)
);

CREATE TABLE sites (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  customer_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, customer_id, id),
  FOREIGN KEY (organization_id, customer_id)
    REFERENCES customers(organization_id, id)
);

CREATE TABLE work_records (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  worker_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  site_id uuid NOT NULL,
  work_date date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','CONFIRMED','VOID')),
  attendance text CHECK (attendance IN ('FULL','HALF','ABSENT')),
  units numeric(3,2) GENERATED ALWAYS AS (
    CASE attendance WHEN 'FULL' THEN 1.00
                    WHEN 'HALF' THEN 0.50
                    WHEN 'ABSENT' THEN 0.00 ELSE NULL END
  ) STORED,
  selling_rate numeric(14,2) CHECK (selling_rate > 0),
  wage_rate numeric(14,2) CHECK (wage_rate > 0),
  charge_amount numeric(14,2),
  wage_amount numeric(14,2),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  replaces_work_id uuid,
  created_by uuid NOT NULL,
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, replaces_work_id),
  FOREIGN KEY (organization_id, worker_id)
    REFERENCES workers(organization_id, id),
  FOREIGN KEY (organization_id, customer_id, site_id)
    REFERENCES sites(organization_id, customer_id, id),
  FOREIGN KEY (organization_id, replaces_work_id)
    REFERENCES work_records(organization_id, id),
  FOREIGN KEY (organization_id, created_by)
    REFERENCES memberships(organization_id, id),
  FOREIGN KEY (organization_id, confirmed_by)
    REFERENCES memberships(organization_id, id),
  CHECK (status <> 'CONFIRMED' OR (
    attendance IS NOT NULL AND selling_rate IS NOT NULL
    AND wage_rate IS NOT NULL AND charge_amount IS NOT NULL
    AND wage_amount IS NOT NULL AND confirmed_by IS NOT NULL
    AND confirmed_at IS NOT NULL
    AND charge_amount = round(selling_rate * units, 2)
    AND wage_amount = round(wage_rate * units, 2)
  ))
);

CREATE UNIQUE INDEX uq_worker_active_day
  ON work_records(organization_id, worker_id, work_date)
  WHERE status IN ('DRAFT','CONFIRMED');

CREATE TABLE ledger_accounts (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  kind text NOT NULL CHECK (kind IN ('CUSTOMER','WORKER')),
  customer_id uuid,
  worker_id uuid,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, customer_id),
  UNIQUE (organization_id, worker_id),
  FOREIGN KEY (organization_id, customer_id)
    REFERENCES customers(organization_id, id),
  FOREIGN KEY (organization_id, worker_id)
    REFERENCES workers(organization_id, id),
  CHECK (
    (kind = 'CUSTOMER' AND customer_id IS NOT NULL AND worker_id IS NULL)
    OR (kind = 'WORKER' AND worker_id IS NOT NULL AND customer_id IS NULL)
  )
);

CREATE TABLE posting_batches (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  kind text NOT NULL CHECK (kind IN
    ('WORK','PAYMENT','OPENING','ADJUSTMENT','REVERSAL')),
  source_key text NOT NULL,
  work_id uuid,
  effective_date date NOT NULL,
  reversal_of uuid,
  reason text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, source_key),
  UNIQUE (organization_id, reversal_of),
  FOREIGN KEY (organization_id, work_id)
    REFERENCES work_records(organization_id, id),
  FOREIGN KEY (organization_id, reversal_of)
    REFERENCES posting_batches(organization_id, id),
  FOREIGN KEY (organization_id, created_by)
    REFERENCES memberships(organization_id, id),
  CHECK ((kind = 'REVERSAL') = (reversal_of IS NOT NULL)),
  CHECK (kind <> 'WORK' OR work_id IS NOT NULL),
  CHECK (kind NOT IN ('REVERSAL','ADJUSTMENT')
    OR (reason IS NOT NULL AND length(trim(reason)) > 0))
);

CREATE UNIQUE INDEX uq_work_posting
  ON posting_batches(organization_id, work_id) WHERE kind = 'WORK';

CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  batch_id uuid NOT NULL,
  account_id uuid NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN
    ('CHARGE','WAGE','RECEIPT','PAYOUT','REFUND',
     'ADVANCE_REPAYMENT','OPENING','ADJUSTMENT','REVERSAL')),
  amount numeric(14,2) NOT NULL CHECK (amount <> 0),
  reversal_of uuid,
  description text NOT NULL,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, batch_id, account_id),
  UNIQUE (organization_id, reversal_of),
  FOREIGN KEY (organization_id, batch_id)
    REFERENCES posting_batches(organization_id, id),
  FOREIGN KEY (organization_id, account_id)
    REFERENCES ledger_accounts(organization_id, id),
  FOREIGN KEY (organization_id, reversal_of)
    REFERENCES ledger_entries(organization_id, id),
  CHECK ((entry_type = 'REVERSAL') = (reversal_of IS NOT NULL)),
  CHECK (
    (entry_type IN ('CHARGE','WAGE','REFUND','ADVANCE_REPAYMENT') AND amount > 0)
    OR (entry_type IN ('RECEIPT','PAYOUT') AND amount < 0)
    OR entry_type IN ('OPENING','ADJUSTMENT','REVERSAL')
  )
);

CREATE TABLE payments (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  account_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN
    ('CUSTOMER_RECEIPT','CUSTOMER_REFUND',
     'WORKER_PAYOUT','WORKER_ADVANCE_REPAYMENT')),
  payment_date date NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('CASH','BANK','UPI')),
  reference text,
  receipt_number text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, batch_id),
  UNIQUE (organization_id, receipt_number),
  FOREIGN KEY (organization_id, account_id)
    REFERENCES ledger_accounts(organization_id, id),
  FOREIGN KEY (organization_id, batch_id)
    REFERENCES posting_batches(organization_id, id)
);
