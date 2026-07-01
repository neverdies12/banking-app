import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, from_account_id, to_account_id, payee, amount, note, created_at FROM transfers WHERE user_id = $1 ORDER BY created_at DESC, id DESC",
    [req.user.sub]
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      fromAccountId: r.from_account_id,
      toAccountId: r.to_account_id,
      payee: r.payee,
      amount: Number(r.amount),
      note: r.note,
      createdAt: r.created_at,
    }))
  );
});

router.post("/", async (req, res) => {
  const userId = req.user.sub;
  const { fromAccountId, toAccountId, payeeName, amount, note } = req.body;
  const amt = Number(amount);

  if (!fromAccountId || !amt || amt <= 0) {
    return res.status(400).json({ error: "Enter an amount greater than $0." });
  }
  if (!toAccountId && !payeeName?.trim()) {
    return res.status(400).json({ error: "Enter a payee name." });
  }
  if (toAccountId && toAccountId === fromAccountId) {
    return res.status(400).json({ error: "Choose two different accounts." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const fromResult = await client.query(
      "SELECT id, type, balance FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [fromAccountId, userId]
    );
    const fromAccount = fromResult.rows[0];
    if (!fromAccount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Source account not found." });
    }
    if (fromAccount.type !== "credit" && Number(fromAccount.balance) < amt) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Insufficient funds in the source account." });
    }

    let payee = payeeName;
    if (toAccountId) {
      const toResult = await client.query(
        "SELECT id, name FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE",
        [toAccountId, userId]
      );
      const toAccount = toResult.rows[0];
      if (!toAccount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Destination account not found." });
      }
      payee = toAccount.name;
      await client.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [amt, toAccountId]);
    }

    await client.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [amt, fromAccountId]);

    await client.query(
      "INSERT INTO transactions (user_id, account_id, merchant, category, amount) VALUES ($1, $2, $3, 'Transfer', $4)",
      [userId, fromAccountId, `Transfer to ${payee}`, -amt]
    );

    const transferResult = await client.query(
      `INSERT INTO transfers (user_id, from_account_id, to_account_id, payee, amount, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [userId, fromAccountId, toAccountId || null, payee, amt, note || null]
    );

    await client.query("COMMIT");
    res.status(201).json({
      id: transferResult.rows[0].id,
      fromAccountId,
      toAccountId: toAccountId || null,
      payee,
      amount: amt,
      note: note || null,
      createdAt: transferResult.rows[0].created_at,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

export default router;
