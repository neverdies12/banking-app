import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);

  await pool.query(`
    INSERT INTO accounts (id, name, type, last4, balance, apy, credit_limit) VALUES
      ('chk', 'Everyday Checking', 'checking', '4821', 4286.52, NULL, NULL),
      ('sav', 'High-Yield Savings', 'savings', '7734', 18940.10, 4.2, NULL),
      ('cc', 'Sable Credit Card', 'credit', '2290', -1240.33, NULL, 5000)
  `);

  await pool.query(`
    INSERT INTO cards (account_id, frozen, spend_limit) VALUES
      ('chk', FALSE, NULL),
      ('cc', FALSE, 2000)
  `);

  await pool.query(`
    INSERT INTO transactions (account_id, merchant, category, amount, occurred_at) VALUES
      ('chk', 'Fresh Market', 'Groceries', -68.42, '2026-06-30'),
      ('chk', 'Paycheck — Nimbus Co.', 'Income', 3200.00, '2026-06-29'),
      ('cc', 'Ridefare', 'Transport', -18.90, '2026-06-28'),
      ('cc', 'Basil & Vine', 'Dining', -54.10, '2026-06-27'),
      ('cc', 'Streamly', 'Entertainment', -15.99, '2026-06-26'),
      ('cc', 'Northside Apparel', 'Shopping', -122.30, '2026-06-25'),
      ('chk', 'Metro Transit', 'Transport', -34.00, '2026-06-24'),
      ('chk', 'Fresh Market', 'Groceries', -41.15, '2026-06-22'),
      ('chk', 'PowerGrid Electric', 'Bills', -86.40, '2026-06-20'),
      ('cc', 'Café Marrow', 'Dining', -12.75, '2026-06-18'),
      ('sav', 'Interest Payment', 'Income', 64.20, '2026-06-15'),
      ('cc', 'Home Cinema Co.', 'Entertainment', -26.50, '2026-06-12'),
      ('chk', 'Fresh Market', 'Groceries', -73.88, '2026-06-10'),
      ('chk', 'Skyline Apartments', 'Bills', -1450.00, '2026-06-05')
  `);

  await pool.query(`
    INSERT INTO bills (id, name, amount, due_date, status) VALUES
      ('b1', 'Skyline Apartments — Rent', 1450.00, '2026-07-05', 'due'),
      ('b2', 'PowerGrid Electric', 86.40, '2026-07-08', 'due'),
      ('b3', 'Fibernet Internet', 59.99, '2026-07-12', 'due'),
      ('b4', 'Streamly Subscription', 15.99, '2026-07-15', 'due'),
      ('b5', 'Guardian Auto Insurance', 112.00, '2026-06-28', 'paid')
  `);

  console.log("Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
