import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name, amount, due_date, status FROM bills WHERE user_id = $1 ORDER BY due_date",
    [req.user.sub]
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      amount: Number(r.amount),
      due: r.due_date,
      status: r.status,
    }))
  );
});

router.post("/:id/pay", async (req, res) => {
  const userId = req.user.sub;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const billResult = await client.query(
      "SELECT id, name, amount, status FROM bills WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [req.params.id, userId]
    );
    const bill = billResult.rows[0];
    if (!bill) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Bill not found." });
    }
    if (bill.status === "paid") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Bill is already paid." });
    }

    const checkingResult = await client.query(
      "SELECT id FROM accounts WHERE user_id = $1 AND type = 'checking' FOR UPDATE",
      [userId]
    );
    const checkingAccount = checkingResult.rows[0];
    if (!checkingAccount) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No checking account found to pay from." });
    }

    await client.query("UPDATE bills SET status = 'paid' WHERE id = $1 AND user_id = $2", [
      bill.id,
      userId,
    ]);
    await client.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [
      bill.amount,
      checkingAccount.id,
    ]);
    await client.query(
      "INSERT INTO transactions (user_id, account_id, merchant, category, amount) VALUES ($1, $2, $3, 'Bills', $4)",
      [userId, checkingAccount.id, bill.name, -bill.amount]
    );

    await client.query("COMMIT");
    res.json({ id: bill.id, name: bill.name, amount: Number(bill.amount), status: "paid" });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

export default router;
