import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, account_id, merchant, category, amount, occurred_at FROM transactions WHERE user_id = $1 ORDER BY occurred_at DESC, id DESC",
    [req.user.sub]
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      accountId: r.account_id,
      merchant: r.merchant,
      category: r.category,
      amount: Number(r.amount),
      occurredAt: r.occurred_at,
    }))
  );
});

export default router;
