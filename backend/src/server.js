import "dotenv/config";
import express from "express";
import cors from "cors";

import accountsRouter from "./routes/accounts.js";
import transactionsRouter from "./routes/transactions.js";
import billsRouter from "./routes/bills.js";
import transfersRouter from "./routes/transfers.js";
import cardsRouter from "./routes/cards.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*" }));
app.use(express.json());

app.get("/", (req, res) => res.json({ ok: true, service: "banking-app-backend" }));
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/accounts", accountsRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/bills", billsRouter);
app.use("/api/transfers", transfersRouter);
app.use("/api/cards", cardsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
