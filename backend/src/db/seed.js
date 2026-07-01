import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEMO_EMAIL = "alex@sable.bank";
const DEMO_PASSWORD = "sable-demo";

async function seed() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const userResult = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, status) VALUES ($1, $2, $3, 'admin', 'approved') RETURNING id`,
    [DEMO_EMAIL, passwordHash, "Alex Rivera"]
  );
  const userId = userResult.rows[0].id;

  const accountsResult = await pool.query(
    `INSERT INTO accounts (user_id, name, type, last4, balance, apy, credit_limit) VALUES
      ($1, 'Everyday Checking', 'checking', '4821', 4286.52, NULL, NULL),
      ($1, 'High-Yield Savings', 'savings', '7734', 18940.10, 4.2, NULL),
      ($1, 'Sable Credit Card', 'credit', '2290', -1240.33, NULL, 5000)
    RETURNING id, type`,
    [userId]
  );
  const chkId = accountsResult.rows.find((r) => r.type === "checking").id;
  const savId = accountsResult.rows.find((r) => r.type === "savings").id;
  const ccId = accountsResult.rows.find((r) => r.type === "credit").id;

  await pool.query(
    `INSERT INTO cards (account_id, frozen, spend_limit) VALUES ($1, FALSE, NULL), ($2, FALSE, 2000)`,
    [chkId, ccId]
  );

  const transactionRows = [
    [chkId, "Fresh Market", "Groceries", -68.42, "2026-06-30"],
    [chkId, "Paycheck — Nimbus Co.", "Income", 3200.0, "2026-06-29"],
    [ccId, "Ridefare", "Transport", -18.9, "2026-06-28"],
    [ccId, "Basil & Vine", "Dining", -54.1, "2026-06-27"],
    [ccId, "Streamly", "Entertainment", -15.99, "2026-06-26"],
    [ccId, "Northside Apparel", "Shopping", -122.3, "2026-06-25"],
    [chkId, "Metro Transit", "Transport", -34.0, "2026-06-24"],
    [chkId, "Fresh Market", "Groceries", -41.15, "2026-06-22"],
    [chkId, "PowerGrid Electric", "Bills", -86.4, "2026-06-20"],
    [ccId, "Café Marrow", "Dining", -12.75, "2026-06-18"],
    [savId, "Interest Payment", "Income", 64.2, "2026-06-15"],
    [ccId, "Home Cinema Co.", "Entertainment", -26.5, "2026-06-12"],
    [chkId, "Fresh Market", "Groceries", -73.88, "2026-06-10"],
    [chkId, "Skyline Apartments", "Bills", -1450.0, "2026-06-05"],
  ];
  for (const [accountId, merchant, category, amount, occurredAt] of transactionRows) {
    await pool.query(
      `INSERT INTO transactions (user_id, account_id, merchant, category, amount, occurred_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, accountId, merchant, category, amount, occurredAt]
    );
  }

  await pool.query(
    `INSERT INTO bills (id, user_id, name, amount, due_date, status) VALUES
      ('b1', $1, 'Skyline Apartments — Rent', 1450.00, '2026-07-05', 'due'),
      ('b2', $1, 'PowerGrid Electric', 86.40, '2026-07-08', 'due'),
      ('b3', $1, 'Fibernet Internet', 59.99, '2026-07-12', 'due'),
      ('b4', $1, 'Streamly Subscription', 15.99, '2026-07-15', 'due'),
      ('b5', $1, 'Guardian Auto Insurance', 112.00, '2026-06-28', 'paid')`,
    [userId]
  );

  console.log("Seed complete.");
  console.log(`Demo admin login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
