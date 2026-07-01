import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/users", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC"
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      status: r.status,
      createdAt: r.created_at,
    }))
  );
});

router.post("/users/:id/approve", async (req, res) => {
  const userId = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      "SELECT id, name FROM users WHERE id = $1 FOR UPDATE",
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }

    await client.query("UPDATE users SET status = 'approved' WHERE id = $1", [userId]);

    const existingAccounts = await client.query(
      "SELECT id FROM accounts WHERE user_id = $1",
      [userId]
    );

    if (existingAccounts.rows.length === 0) {
      const last4 = String(1000 + Math.floor(Math.random() * 9000));

      const checkingResult = await client.query(
        `INSERT INTO accounts (user_id, name, type, last4, balance) VALUES ($1, 'Everyday Checking', 'checking', $2, 0) RETURNING id`,
        [userId, last4]
      );
      await client.query(`INSERT INTO cards (account_id, frozen) VALUES ($1, FALSE)`, [
        checkingResult.rows[0].id,
      ]);

      await client.query(
        `INSERT INTO accounts (user_id, name, type, last4, balance, apy) VALUES ($1, 'High-Yield Savings', 'savings', $2, 0, 4.2)`,
        [userId, last4]
      );
    }

    await client.query("COMMIT");
    res.json({ id: userId, status: "approved" });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.post("/users/:id/reject", async (req, res) => {
  const userId = Number(req.params.id);
  const result = await pool.query(
    "UPDATE users SET status = 'rejected' WHERE id = $1 RETURNING id",
    [userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "User not found." });
  }
  res.json({ id: userId, status: "rejected" });
});

export default router;
