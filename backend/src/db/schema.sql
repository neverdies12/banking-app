DROP TABLE IF EXISTS transfers;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS accounts;

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit')),
  last4 TEXT NOT NULL,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  apy NUMERIC(5, 2),
  credit_limit NUMERIC(12, 2)
);

CREATE TABLE cards (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  frozen BOOLEAN NOT NULL DEFAULT FALSE,
  spend_limit NUMERIC(12, 2)
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  merchant TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  occurred_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('due', 'paid')) DEFAULT 'due'
);

CREATE TABLE transfers (
  id SERIAL PRIMARY KEY,
  from_account_id TEXT NOT NULL REFERENCES accounts(id),
  to_account_id TEXT REFERENCES accounts(id),
  payee TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  note TEXT,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE
);
