import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name, type, last4, balance, apy, credit_limit FROM accounts ORDER BY id"
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      last4: r.last4,
      balance: Number(r.balance),
      apy: r.apy === null ? null : Number(r.apy),
      limit: r.credit_limit === null ? null : Number(r.credit_limit),
    }))
  );
});

export default router;
