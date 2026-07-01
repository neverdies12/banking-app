import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

const CHECKING_ACCOUNT_ID = "chk";

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name, amount, due_date, status FROM bills ORDER BY due_date"
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const billResult = await client.query(
      "SELECT id, name, amount, status FROM bills WHERE id = $1 FOR UPDATE",
      [req.params.id]
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

    await client.query("UPDATE bills SET status = 'paid' WHERE id = $1", [bill.id]);
    await client.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [
      bill.amount,
      CHECKING_ACCOUNT_ID,
    ]);
    await client.query(
      "INSERT INTO transactions (account_id, merchant, category, amount) VALUES ($1, $2, 'Bills', $3)",
      [CHECKING_ACCOUNT_ID, bill.name, -bill.amount]
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
