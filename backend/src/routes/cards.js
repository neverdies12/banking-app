import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT account_id, frozen, spend_limit FROM cards");
  const cards = {};
  for (const r of rows) {
    cards[r.account_id] = {
      frozen: r.frozen,
      limit: r.spend_limit === null ? null : Number(r.spend_limit),
    };
  }
  res.json(cards);
});

router.patch("/:accountId", async (req, res) => {
  const { accountId } = req.params;
  const { frozen, limit } = req.body;

  const existing = await pool.query("SELECT account_id FROM cards WHERE account_id = $1", [accountId]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Card not found." });
  }

  if (typeof frozen === "boolean") {
    await pool.query("UPDATE cards SET frozen = $1 WHERE account_id = $2", [frozen, accountId]);
  }
  if (typeof limit === "number") {
    await pool.query("UPDATE cards SET spend_limit = $1 WHERE account_id = $2", [limit, accountId]);
  }

  const { rows } = await pool.query(
    "SELECT account_id, frozen, spend_limit FROM cards WHERE account_id = $1",
    [accountId]
  );
  res.json({
    accountId: rows[0].account_id,
    frozen: rows[0].frozen,
    limit: rows[0].spend_limit === null ? null : Number(rows[0].spend_limit),
  });
});

export default router;
