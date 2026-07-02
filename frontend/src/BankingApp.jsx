import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Home, Send, Receipt, PieChart as PieIcon, CreditCard, History as HistoryIcon,
  Bell, Settings as SettingsIcon, Snowflake, Eye, EyeOff, Search,
  ArrowDownLeft, ShoppingCart, Utensils, Car, ShoppingBag, Film,
  ChevronRight, Check, ArrowLeftRight, Wallet, PiggyBank, LogOut, ShieldCheck, X, Landmark
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip
} from "recharts";
import { api } from "./api.js";

const COLORS = {
  ink: "#12191A",
  ink2: "#1B2422",
  ink3: "#212C29",
  bone: "#F4EFE4",
  boneDim: "#B9C4BE",
  moss: "#4C7A6C",
  mossLight: "#6FA08F",
  gold: "#C99A4A",
  slate: "#8B9A97",
  azure: "#6C8FA8",
  pos: "#6FBF8B",
  neg: "#D97757",
};

const CATEGORY_META = {
  Groceries: { color: COLORS.moss, icon: ShoppingCart },
  Dining: { color: COLORS.gold, icon: Utensils },
  Transport: { color: COLORS.slate, icon: Car },
  Shopping: { color: COLORS.neg, icon: ShoppingBag },
  Bills: { color: COLORS.pos, icon: Receipt },
  Entertainment: { color: COLORS.azure, icon: Film },
  Income: { color: COLORS.pos, icon: ArrowDownLeft },
  Transfer: { color: COLORS.boneDim, icon: ArrowLeftRight },
  Adjustment: { color: COLORS.azure, icon: Landmark },
};

// Kept local: the backend models accounts/transactions/bills/transfers/cards,
// but not a full budgeting/net-worth-history subsystem — that's out of scope
// for this pass, so these two stay as display-only demo series.
const budgets = [
  { category: "Groceries", budget: 400, spent: 318 },
  { category: "Dining", budget: 200, spent: 246 },
  { category: "Transport", budget: 150, spent: 88 },
  { category: "Shopping", budget: 300, spent: 172 },
  { category: "Entertainment", budget: 60, spent: 42 },
];

const trendData = [
  { month: "Jan", net: 18400 },
  { month: "Feb", net: 19120 },
  { month: "Mar", net: 19860 },
  { month: "Apr", net: 20510 },
  { month: "May", net: 21230 },
  { month: "Jun", net: 21986 },
];

const BASE_NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "transfer", label: "Transfer", icon: Send },
  { id: "insights", label: "Insights", icon: PieIcon },
  { id: "cards", label: "Cards", icon: CreditCard },
  { id: "history", label: "History", icon: HistoryIcon },
];

const fmt = (n, opts = {}) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", ...opts }).format(n);

const formatDate = (input) => {
  if (!input) return "";
  const d = typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)
    ? new Date(`${input}T00:00:00`)
    : new Date(input);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500..700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  .app-root { background: ${COLORS.ink}; color: ${COLORS.bone}; min-height: 100vh; }
  .font-display { font-family: 'Fraunces', serif; }
  .font-body { font-family: 'Inter', sans-serif; }
  .font-mono { font-family: 'IBM Plex Mono', monospace; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  .eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: ${COLORS.gold}; }

  .shell { max-width: 1100px; margin: 0 auto; padding: 20px 16px 100px; }
  .topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom: 22px; }
  .brand { font-family:'Fraunces',serif; font-size:22px; color:${COLORS.bone}; letter-spacing:0.5px; }
  .icon-btn { width:38px; height:38px; border-radius:11px; background:${COLORS.ink2}; display:flex; align-items:center; justify-content:center; border:1px solid rgba(244,239,228,0.08); color:${COLORS.boneDim}; cursor:pointer; }
  .icon-btn:hover { border-color: rgba(201,154,74,0.5); color:${COLORS.gold}; }

  .ledger-hero { position:relative; padding: 22px 20px 20px; border-radius: 18px; background: linear-gradient(145deg, ${COLORS.ink2}, ${COLORS.ink3}); border:1px solid rgba(244,239,228,0.08); margin-bottom: 20px; }
  .ledger-hero::before { content:''; position:absolute; top:0; left:16px; right:16px; height:6px; background-image: radial-gradient(circle at 6px 0px, ${COLORS.ink} 4px, transparent 4.2px); background-size:16px 6px; background-repeat:repeat-x; }
  .ledger-amount-lg { font-size: 38px; font-weight:600; }
  .ledger-amount-md { font-size: 22px; font-weight:600; }
  .ledger-amount-sm { font-size: 15px; font-weight:600; }

  .accounts-row { display:flex; gap:12px; overflow-x:auto; padding-bottom:4px; }
  .account-card { min-width: 210px; text-align:left; background:${COLORS.ink2}; border-radius:16px; padding:18px; border:1.5px solid rgba(244,239,228,0.10); cursor:pointer; transition: border-color .2s ease, transform .2s ease; flex-shrink:0; }
  .account-card:hover { transform: translateY(-2px); }

  .stamp-icon { width:34px; height:34px; border-radius:10px; background:rgba(244,239,228,0.06); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .cat-stamp { border-radius: 50%; border: 1.5px dashed currentColor; display:flex; align-items:center; justify-content:center; transform: rotate(-4deg); flex-shrink:0; background: rgba(244,239,228,0.03); }

  .quick-actions { display:flex; gap:10px; margin: 18px 0 26px; flex-wrap:wrap; }
  .quick-action { display:flex; flex-direction:column; align-items:center; gap:6px; background:${COLORS.ink2}; border:1px solid rgba(244,239,228,0.08); border-radius:14px; padding:12px 18px; cursor:pointer; color:${COLORS.bone}; font-size:12px; }
  .quick-action:hover { border-color: rgba(201,154,74,0.5); }
  .quick-action svg { color: ${COLORS.gold}; }

  .panel { background:${COLORS.ink2}; border:1px solid rgba(244,239,228,0.08); border-radius:16px; padding:20px; }
  .tx-row { display:flex; align-items:center; padding:10px 0; border-bottom:1px solid rgba(244,239,228,0.06); }
  .tx-row:last-child { border-bottom:none; }

  .field-label { display:block; font-size:12px; color:${COLORS.slate}; margin: 14px 0 6px; }
  .field-select, .field-input { width:100%; background:${COLORS.ink3}; border:1px solid rgba(244,239,228,0.12); color:${COLORS.bone}; border-radius:10px; padding:10px 12px; font-size:14px; font-family:'Inter',sans-serif; outline:none; }
  .field-select:focus, .field-input:focus { border-color:${COLORS.gold}; }
  .amount-input-wrap { display:flex; align-items:center; gap:8px; background:${COLORS.ink3}; border:1px solid rgba(244,239,228,0.12); border-radius:10px; padding:10px 12px; }
  .amount-input { background:transparent; border:none; padding:0; font-family:'IBM Plex Mono',monospace; font-size:16px; }
  .amount-input:focus { outline:none; }

  .btn-primary { display:flex; align-items:center; justify-content:center; gap:8px; background:${COLORS.gold}; color:${COLORS.ink}; border:none; border-radius:10px; padding:12px; font-weight:600; font-size:14px; cursor:pointer; width:100%; }
  .btn-primary:hover { background: #dcac5c; }
  .btn-primary:disabled { opacity: 0.6; cursor: default; }
  .btn-chip { display:flex; align-items:center; gap:6px; background:rgba(244,239,228,0.06); border:1px solid rgba(244,239,228,0.14); color:${COLORS.bone}; border-radius:99px; padding:7px 13px; font-size:12px; cursor:pointer; white-space:nowrap; }
  .btn-chip:hover { border-color: ${COLORS.gold}; color:${COLORS.gold}; }
  .btn-chip-done { display:flex; align-items:center; gap:5px; color:${COLORS.pos}; font-size:12px; padding:7px 6px; }

  .budget-track { height:7px; border-radius:99px; background:rgba(244,239,228,0.08); overflow:hidden; }
  .budget-fill { height:100%; border-radius:99px; transition: width .5s ease; }

  .card-visual { border-radius:16px; padding:20px; border:1px solid rgba(244,239,228,0.10); position:relative; overflow:hidden; }
  .frozen-badge { display:flex; align-items:center; gap:4px; font-size:11px; color:${COLORS.azure}; background:rgba(108,143,168,0.15); padding:4px 8px; border-radius:99px; }

  .search-wrap { display:flex; align-items:center; gap:8px; background:${COLORS.ink3}; border:1px solid rgba(244,239,228,0.12); border-radius:10px; padding:9px 12px; }
  .search-input { background:transparent; border:none; outline:none; color:${COLORS.bone}; font-size:14px; width:100%; }

  .bottom-nav { position:fixed; bottom:0; left:0; right:0; background:${COLORS.ink2}; border-top:1px solid rgba(244,239,228,0.08); display:flex; justify-content:space-around; padding: 8px 4px 10px; z-index:40; }
  .bottom-nav-item { display:flex; flex-direction:column; align-items:center; gap:3px; font-size:10px; color:${COLORS.slate}; background:none; border:none; cursor:pointer; padding:4px 10px; }
  .bottom-nav-item.active { color: ${COLORS.gold}; }

  .sidebar { position:fixed; top:0; left:0; bottom:0; width:220px; background:${COLORS.ink2}; border-right:1px solid rgba(244,239,228,0.08); padding:26px 16px; }
  .side-item { display:flex; align-items:center; gap:12px; padding:11px 12px; border-radius:10px; color:${COLORS.slate}; cursor:pointer; font-size:14px; margin-bottom:4px; }
  .side-item.active { background: rgba(201,154,74,0.12); color:${COLORS.gold}; }
  .side-item:hover { color: ${COLORS.bone}; }

  .toast { position:fixed; top:20px; right:20px; background:${COLORS.ink3}; border:1px solid rgba(201,154,74,0.4); color:${COLORS.bone}; padding:12px 18px; border-radius:12px; font-size:13px; display:flex; align-items:center; gap:8px; z-index:60; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }

  @media (min-width: 768px) {
    .shell { padding: 30px 32px 40px 252px; }
  }
`;

function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);
  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (Math.abs(diff) < 0.005) { setValue(target); return; }
    let startTime;
    let raf;
    function step(ts) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + diff * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
      else prevRef.current = target;
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function LedgerAmount({ value, size = "lg", showSign = false }) {
  const animated = useCountUp(value);
  const negative = animated < 0;
  const cls = size === "lg" ? "ledger-amount-lg" : size === "md" ? "ledger-amount-md" : "ledger-amount-sm";
  return (
    <span className={`font-mono ${cls}`} style={{ color: negative ? COLORS.neg : COLORS.bone }}>
      {negative ? "-" : showSign ? "+" : ""}{fmt(Math.abs(animated))}
    </span>
  );
}

function AccountIcon({ type }) {
  if (type === "savings") return <PiggyBank size={18} />;
  if (type === "credit") return <CreditCard size={18} />;
  return <Wallet size={18} />;
}

function AccountCard({ account, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="account-card no-scrollbar"
      style={{ borderColor: selected ? COLORS.gold : "rgba(244,239,228,0.10)" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="stamp-icon" style={{ color: COLORS.gold }}><AccountIcon type={account.type} /></div>
        <span className="font-mono text-xs" style={{ color: COLORS.boneDim }}>•••• {account.last4}</span>
      </div>
      <div className="text-xs mb-1 font-body" style={{ color: COLORS.boneDim }}>{account.name}</div>
      <LedgerAmount value={account.balance} size="md" />
      {account.type === "credit" && (
        <div className="text-xs mt-2 font-body" style={{ color: COLORS.slate }}>
          {fmt(account.limit + account.balance)} available of {fmt(account.limit)}
        </div>
      )}
      {account.type === "savings" && (
        <div className="text-xs mt-2 font-body" style={{ color: COLORS.mossLight }}>{account.apy}% APY</div>
      )}
    </button>
  );
}

function CatStamp({ category, size = 36 }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.Transfer;
  const Icon = meta.icon;
  return (
    <div className="cat-stamp" style={{ width: size, height: size, color: meta.color, borderColor: meta.color }}>
      <Icon size={size * 0.5} />
    </div>
  );
}

function TransactionRow({ tx, accountName }) {
  const positive = tx.amount > 0;
  return (
    <div className="tx-row">
      <CatStamp category={tx.category} />
      <div className="flex-1 min-w-0 ml-3">
        <div className="font-body text-sm truncate" style={{ color: COLORS.bone }}>{tx.merchant}</div>
        <div className="font-body text-xs" style={{ color: COLORS.slate }}>{tx.category} · {accountName} · {formatDate(tx.occurredAt)}</div>
      </div>
      <span className="font-mono text-sm whitespace-nowrap" style={{ color: positive ? COLORS.pos : COLORS.bone }}>
        {positive ? "+" : "-"}{fmt(Math.abs(tx.amount))}
      </span>
    </div>
  );
}

function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 className="font-display" style={{ fontSize: 22, color: COLORS.bone, fontWeight: 600 }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function TransferPanel({ accounts, onTransfer, transfers }) {
  const [from, setFrom] = useState(accounts[0]?.id ?? "");
  const [to, setTo] = useState("external");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!from && accounts[0]) setFrom(accounts[0].id);
  }, [accounts, from]);

  const submit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter an amount greater than $0."); return; }
    if (to === "external" && !payee.trim()) { setError("Enter a payee name."); return; }
    if (from === to) { setError("Choose two different accounts."); return; }
    const fromAcc = accounts.find((a) => a.id === from);
    if (fromAcc.type !== "credit" && fromAcc.balance < amt) { setError("Insufficient funds in the source account."); return; }

    setError("");
    setSubmitting(true);
    try {
      await onTransfer({
        fromAccountId: from,
        toAccountId: to === "external" ? null : to,
        payeeName: to === "external" ? payee : undefined,
        amount: amt,
        note,
      });
      setAmount(""); setNote(""); setPayee("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={submit} className="panel">
        <div className="eyebrow mb-4">Move money</div>
        <label className="field-label">From</label>
        <select className="field-select" value={from} onChange={(e) => setFrom(e.target.value)}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {fmt(a.balance)}</option>)}
        </select>

        <label className="field-label">To</label>
        <select className="field-select" value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="external">Someone else (external payee)</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        {to === "external" && (
          <>
            <label className="field-label">Payee name</label>
            <input className="field-input" value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="e.g. Jordan Reyes" />
          </>
        )}

        <label className="field-label">Amount</label>
        <div className="amount-input-wrap">
          <span className="font-mono" style={{ color: COLORS.slate }}>$</span>
          <input className="field-input amount-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" />
        </div>

        <label className="field-label">Note (optional)</label>
        <input className="field-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's this for?" />

        {error && <div className="text-sm mt-3" style={{ color: COLORS.neg }}>{error}</div>}

        <button type="submit" className="btn-primary mt-6" disabled={submitting}>
          <Send size={16} /> {submitting ? "Sending…" : "Send transfer"}
        </button>
      </form>

      <div className="panel">
        <div className="eyebrow mb-4">Recent transfers</div>
        {transfers.length === 0 && <div className="text-sm font-body" style={{ color: COLORS.slate }}>No transfers yet. Your sent transfers will appear here.</div>}
        <div className="flex flex-col gap-1">
          {transfers.map((t) => (
            <div key={t.id} className="tx-row">
              <CatStamp category="Transfer" />
              <div className="flex-1 min-w-0 ml-3">
                <div className="font-body text-sm" style={{ color: COLORS.bone }}>To {t.payee}</div>
                <div className="font-body text-xs" style={{ color: COLORS.slate }}>{t.note || "No note"} · {formatDate(t.createdAt)}</div>
              </div>
              <span className="font-mono text-sm" style={{ color: COLORS.bone }}>-{fmt(t.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BillsPanel({ bills, onPay }) {
  return (
    <div className="panel">
      <div className="eyebrow mb-4">Upcoming &amp; recent bills</div>
      <div className="flex flex-col gap-1">
        {bills.map((b) => (
          <div key={b.id} className="tx-row">
            <div className="stamp-icon" style={{ color: b.status === "paid" ? COLORS.slate : COLORS.gold }}>
              <Receipt size={18} />
            </div>
            <div className="flex-1 min-w-0 ml-3">
              <div className="font-body text-sm" style={{ color: COLORS.bone }}>{b.name}</div>
              <div className="font-body text-xs" style={{ color: COLORS.slate }}>
                {b.status === "paid" ? `Paid on ${formatDate(b.due)}` : `Due ${formatDate(b.due)}`}
              </div>
            </div>
            <span className="font-mono text-sm mr-3" style={{ color: COLORS.bone }}>{fmt(b.amount)}</span>
            {b.status === "due" ? (
              <button className="btn-chip" onClick={() => onPay(b)}>Pay now</button>
            ) : (
              <span className="btn-chip-done"><Check size={13} /> Paid</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetBar({ item }) {
  const pct = Math.min((item.spent / item.budget) * 100, 100);
  const over = item.spent > item.budget;
  const meta = CATEGORY_META[item.category];
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1.5">
        <span className="font-body text-sm" style={{ color: COLORS.bone }}>{item.category}</span>
        <span className="font-mono text-xs" style={{ color: over ? COLORS.neg : COLORS.slate }}>
          {fmt(item.spent)} / {fmt(item.budget)}
        </span>
      </div>
      <div className="budget-track">
        <div className="budget-fill" style={{ width: `${pct}%`, background: over ? COLORS.neg : meta.color }} />
      </div>
    </div>
  );
}

function InsightsPanel({ transactions }) {
  const spendByCategory = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      if (t.amount < 0 && t.category !== "Transfer") {
        map[t.category] = (map[t.category] || 0) + Math.abs(t.amount);
      }
    });
    return Object.entries(map).map(([category, value]) => ({ category, value, color: CATEGORY_META[category]?.color || COLORS.slate }));
  }, [transactions]);

  const totalSpend = spendByCategory.reduce((s, c) => s + c.value, 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="panel">
        <div className="eyebrow mb-2">Spending by category</div>
        <div style={{ height: 220, position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={spendByCategory} dataKey="value" nameKey="category" innerRadius={62} outerRadius={90} paddingAngle={3}>
                {spendByCategory.map((c, i) => <Cell key={i} fill={c.color} stroke={COLORS.ink} strokeWidth={2} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: COLORS.ink3, border: "1px solid rgba(244,239,228,0.15)", borderRadius: 8, fontFamily: "Inter" }}
                itemStyle={{ color: COLORS.bone }}
                formatter={(v) => fmt(v)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
            <div className="font-mono text-lg" style={{ color: COLORS.bone }}>{fmt(totalSpend)}</div>
            <div className="text-xs font-body" style={{ color: COLORS.slate }}>this month</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-3 justify-center">
          {spendByCategory.map((c) => (
            <div key={c.category} className="flex items-center gap-1.5 text-xs font-body" style={{ color: COLORS.boneDim }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: c.color, display: "inline-block" }} />
              {c.category}
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="eyebrow mb-4">Monthly budgets</div>
        {budgets.map((b) => <BudgetBar key={b.category} item={b} />)}
      </div>

      <div className="panel md:col-span-2">
        <div className="eyebrow mb-4">Net worth trend</div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.mossLight} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={COLORS.mossLight} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke={COLORS.slate} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis hide domain={["dataMin - 1000", "dataMax + 1000"]} />
              <Tooltip
                contentStyle={{ background: COLORS.ink3, border: "1px solid rgba(244,239,228,0.15)", borderRadius: 8 }}
                itemStyle={{ color: COLORS.bone }}
                formatter={(v) => fmt(v)}
              />
              <Area type="monotone" dataKey="net" stroke={COLORS.mossLight} strokeWidth={2} fill="url(#netGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function CardVisual({ account, card, cardholderName, onToggleFreeze, onLimitChange, onReveal, revealed }) {
  const isCredit = account.type === "credit";
  return (
    <div className="panel">
      <div
        className="card-visual"
        style={{
          background: isCredit
            ? `linear-gradient(135deg, ${COLORS.ink3}, ${COLORS.ink2})`
            : `linear-gradient(135deg, ${COLORS.moss}, ${COLORS.ink3})`,
          opacity: card.frozen ? 0.55 : 1,
        }}
      >
        <div className="flex justify-between items-start">
          <span className="font-display" style={{ color: COLORS.gold, fontSize: 18, letterSpacing: 1 }}>Sable</span>
          {card.frozen && <span className="frozen-badge"><Snowflake size={12} /> Frozen</span>}
        </div>
        <div className="font-mono mt-8" style={{ color: COLORS.bone, fontSize: 18, letterSpacing: 3 }}>
          {revealed ? "4821  6650  9932  " + account.last4 : "••••  ••••  ••••  " + account.last4}
        </div>
        <div className="flex justify-between items-end mt-6">
          <div>
            <div className="text-xs font-body" style={{ color: COLORS.boneDim }}>{isCredit ? "Credit Card" : "Debit Card"}</div>
            <div className="font-body text-sm" style={{ color: COLORS.bone }}>{cardholderName}</div>
          </div>
          <div className="font-mono text-xs" style={{ color: COLORS.boneDim }}>{revealed ? "07/29" : "••/••"}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button className="btn-chip" onClick={onReveal}>
          {revealed ? <EyeOff size={14} /> : <Eye size={14} />} {revealed ? "Hide details" : "Reveal details"}
        </button>
        <button className="btn-chip" onClick={onToggleFreeze}>
          <Snowflake size={14} /> {card.frozen ? "Unfreeze card" : "Freeze card"}
        </button>
      </div>

      {isCredit && (
        <div className="mt-5">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs font-body" style={{ color: COLORS.slate }}>Monthly spend limit</span>
            <span className="font-mono text-xs" style={{ color: COLORS.bone }}>{fmt(card.limit)}</span>
          </div>
          <input
            type="range" min="200" max="5000" step="100" value={card.limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            className="w-full"
            style={{ accentColor: COLORS.gold }}
          />
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ transactions, accounts }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const accName = (id) => accounts.find((a) => a.id === id)?.name || "";

  const filtered = transactions.filter((t) => {
    const matchesQuery = t.merchant.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || t.category === filter;
    return matchesQuery && matchesFilter;
  });

  const categories = ["all", ...Object.keys(CATEGORY_META).filter((c) => c !== "Transfer")];

  return (
    <div className="panel">
      <div className="eyebrow mb-4">All transactions</div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="search-wrap flex-1">
          <Search size={15} style={{ color: COLORS.slate }} />
          <input className="search-input" placeholder="Search merchant…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="field-select" style={{ width: "auto", marginTop: 0 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        {filtered.length === 0 && <div className="text-sm font-body py-6 text-center" style={{ color: COLORS.slate }}>No transactions match.</div>}
        {filtered.map((t) => <TransactionRow key={t.id} tx={t} accountName={accName(t.accountId)} />)}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { token, user } = await api.login(email, password);
      api.saveSession(token, user);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
      <form onSubmit={submit} className="panel" style={{ width: "100%", maxWidth: 380 }}>
        <div className="brand mb-1" style={{ color: COLORS.gold }}>Sable</div>
        <div className="eyebrow mb-6">Sign in to your account</div>

        <label className="field-label">Email</label>
        <input
          className="field-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="username"
        />

        <label className="field-label">Password</label>
        <input
          className="field-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        {error && <div className="text-sm mt-3" style={{ color: COLORS.neg }}>{error}</div>}

        <button type="submit" className="btn-primary mt-6" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <div className="text-sm font-body mt-4" style={{ color: COLORS.slate, textAlign: "center" }}>
          Don't have an account?{" "}
          <span
            style={{ color: COLORS.gold, cursor: "pointer" }}
            onClick={onSwitchToRegister}
          >
            Register
          </span>
        </div>
      </form>
    </div>
  );
}

function RegisterScreen({ onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await api.register(name, email, password);
      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (message) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
        <div className="panel" style={{ width: "100%", maxWidth: 380 }}>
          <div className="brand mb-1" style={{ color: COLORS.gold }}>Sable</div>
          <div className="eyebrow mb-6">Registration received</div>
          <div className="text-sm font-body" style={{ color: COLORS.bone }}>{message}</div>
          <button type="button" className="btn-primary mt-6" onClick={onSwitchToLogin}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
      <form onSubmit={submit} className="panel" style={{ width: "100%", maxWidth: 380 }}>
        <div className="brand mb-1" style={{ color: COLORS.gold }}>Sable</div>
        <div className="eyebrow mb-6">Create an account</div>

        <label className="field-label">Full name</label>
        <input
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jordan Reyes"
          autoComplete="name"
        />

        <label className="field-label">Email</label>
        <input
          className="field-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="username"
        />

        <label className="field-label">Password</label>
        <input
          className="field-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />

        {error && <div className="text-sm mt-3" style={{ color: COLORS.neg }}>{error}</div>}

        <button type="submit" className="btn-primary mt-6" disabled={submitting}>
          {submitting ? "Submitting…" : "Register"}
        </button>

        <div className="text-sm font-body mt-4" style={{ color: COLORS.slate, textAlign: "center" }}>
          Already have an account?{" "}
          <span
            style={{ color: COLORS.gold, cursor: "pointer" }}
            onClick={onSwitchToLogin}
          >
            Sign in
          </span>
        </div>
      </form>
    </div>
  );
}

function AdminAccountRow({ userId, account, onAdjusted, showToast }) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const adjust = async (direction) => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      showToast("Enter an amount greater than $0.");
      return;
    }
    setSubmitting(true);
    try {
      await api.admin.adjustAccount(userId, account.id, direction, amt);
      setAmount("");
      await onAdjusted();
      showToast(
        `${direction === "credit" ? "Credited" : "Debited"} ${fmt(amt)} ${
          direction === "credit" ? "to" : "from"
        } ${account.name}`
      );
    } catch (err) {
      showToast(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-body text-xs flex-1 min-w-0 truncate" style={{ color: COLORS.boneDim }}>
        {account.name} · <span className="font-mono">{fmt(account.balance)}</span>
      </span>
      <div className="amount-input-wrap" style={{ width: 130, flexShrink: 0 }}>
        <span className="font-mono" style={{ color: COLORS.slate }}>$</span>
        <input
          className="field-input amount-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          inputMode="decimal"
        />
      </div>
      <button className="btn-chip" disabled={submitting} onClick={() => adjust("credit")}>
        Credit
      </button>
      <button className="btn-chip" disabled={submitting} onClick={() => adjust("debit")}>
        Debit
      </button>
    </div>
  );
}

function AdminPanel({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await api.admin.listUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id) => {
    try {
      await api.admin.approveUser(id);
      await load();
      showToast("User approved");
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await api.admin.rejectUser(id);
      await load();
      showToast("User rejected");
    } catch (err) {
      showToast(err.message);
    }
  };

  const statusColor = (status) =>
    status === "approved" ? COLORS.pos : status === "rejected" ? COLORS.neg : COLORS.gold;

  if (loading) {
    return (
      <div className="panel">
        <div className="text-sm font-body" style={{ color: COLORS.slate }}>Loading users…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <div className="text-sm font-body" style={{ color: COLORS.neg }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="eyebrow mb-4">All users</div>
      {users.length === 0 && (
        <div className="text-sm font-body" style={{ color: COLORS.slate }}>No users yet.</div>
      )}
      <div className="flex flex-col gap-3">
        {users.map((u) => (
          <div key={u.id} className="pb-3" style={{ borderBottom: "1px solid rgba(244,239,228,0.06)" }}>
            <div className="flex items-center">
              <div className="stamp-icon" style={{ color: COLORS.gold }}><ShieldCheck size={18} /></div>
              <div className="flex-1 min-w-0 ml-3">
                <div className="font-body text-sm" style={{ color: COLORS.bone }}>
                  {u.name}
                  {u.role === "admin" && (
                    <span className="font-mono text-xs ml-2" style={{ color: COLORS.gold }}>admin</span>
                  )}
                </div>
                <div className="font-body text-xs" style={{ color: COLORS.slate }}>
                  {u.email} · <span style={{ color: statusColor(u.status) }}>{u.status}</span>
                </div>
              </div>
              {u.status === "pending" && (
                <div className="flex gap-2">
                  <button className="btn-chip" onClick={() => handleApprove(u.id)}>
                    <Check size={13} /> Approve
                  </button>
                  <button className="btn-chip" onClick={() => handleReject(u.id)}>
                    <X size={13} /> Reject
                  </button>
                </div>
              )}
            </div>

            {u.accounts.length > 0 && (
              <div className="flex flex-col gap-2 mt-3" style={{ marginLeft: 46 }}>
                {u.accounts.map((a) => (
                  <AdminAccountRow
                    key={a.id}
                    userId={u.id}
                    account={a}
                    onAdjusted={load}
                    showToast={showToast}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [cards, setCards] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeTab, setActiveTab] = useState("home");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [toast, setToast] = useState(null);
  const [revealed, setRevealed] = useState({});

  const navItems =
    user.role === "admin"
      ? [...BASE_NAV_ITEMS, { id: "admin", label: "Admin", icon: ShieldCheck }]
      : BASE_NAV_ITEMS;

  const loadAll = useCallback(async () => {
    const [accountsData, transactionsData, billsData, transfersData, cardsData] = await Promise.all([
      api.getAccounts(),
      api.getTransactions(),
      api.getBills(),
      api.getTransfers(),
      api.getCards(),
    ]);
    setAccounts(accountsData);
    setTransactions(transactionsData);
    setBills(billsData);
    setTransfers(transfersData);
    setCards(cardsData);
    setSelectedAccount((prev) => prev ?? accountsData[0]?.id ?? null);
  }, []);

  useEffect(() => {
    loadAll()
      .catch((err) => setLoadError(err.message || "Could not reach the banking API."))
      .finally(() => setLoading(false));
  }, [loadAll]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const netWorth = accounts.reduce((s, a) => s + a.balance, 0);
  const showToast = (msg) => setToast(msg);

  const handleTransfer = async (payload) => {
    const transfer = await api.createTransfer(payload);
    await loadAll();
    showToast(`Sent ${fmt(transfer.amount)} to ${transfer.payee}`);
  };

  const handlePayBill = async (bill) => {
    try {
      await api.payBill(bill.id);
      await loadAll();
      showToast(`Paid ${bill.name} — ${fmt(bill.amount)}`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleToggleFreeze = async (accountId) => {
    try {
      const updated = await api.patchCard(accountId, { frozen: !cards[accountId]?.frozen });
      setCards((prev) => ({ ...prev, [accountId]: { frozen: updated.frozen, limit: updated.limit } }));
      showToast(updated.frozen ? "Card frozen" : "Card unfrozen");
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleLimitChange = async (accountId, limit) => {
    try {
      const updated = await api.patchCard(accountId, { limit });
      setCards((prev) => ({ ...prev, [accountId]: { frozen: updated.frozen, limit: updated.limit } }));
    } catch (err) {
      showToast(err.message);
    }
  };

  const accName = (id) => accounts.find((a) => a.id === id)?.name || "";

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="eyebrow">Loading your accounts…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
        <div className="panel" style={{ maxWidth: 420 }}>
          <div className="eyebrow mb-2" style={{ color: COLORS.neg }}>Couldn't load the app</div>
          <div className="text-sm font-body" style={{ color: COLORS.bone }}>{loadError}</div>
          <div className="text-xs font-body mt-2" style={{ color: COLORS.slate }}>
            Check that the backend is running and VITE_API_URL points to it.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sidebar hidden md:block">
        <div className="brand mb-8" style={{ color: COLORS.gold }}>Sable</div>
        {navItems.map((item) => (
          <div key={item.id} className={`side-item ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}>
            <item.icon size={17} /> {item.label}
          </div>
        ))}
      </div>

      <div className="shell">
        <div className="topbar">
          <div>
            <div className="eyebrow">Good to see you</div>
            <div className="brand">{user.name}</div>
          </div>
          <div className="flex gap-2">
            <div className="icon-btn"><Bell size={17} /></div>
            <div className="icon-btn"><SettingsIcon size={17} /></div>
            <div className="icon-btn" onClick={onLogout} title="Log out"><LogOut size={17} /></div>
          </div>
        </div>

        <div className="ledger-hero">
          <div className="eyebrow mb-2">Total net worth</div>
          <LedgerAmount value={netWorth} size="lg" />
          <div className="text-xs font-body mt-1" style={{ color: COLORS.boneDim }}>Across {accounts.length} accounts</div>
        </div>

        <div className="accounts-row no-scrollbar mb-2">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} selected={selectedAccount === a.id} onClick={() => setSelectedAccount(a.id)} />
          ))}
        </div>

        <div className="quick-actions">
          <div className="quick-action" onClick={() => setActiveTab("transfer")}><Send size={18} /> Send</div>
          <div className="quick-action" onClick={() => setActiveTab("bills")}><Receipt size={18} /> Pay bill</div>
          <div className="quick-action" onClick={() => setActiveTab("cards")}><Snowflake size={18} /> Freeze card</div>
          <div className="quick-action" onClick={() => setActiveTab("insights")}><PieIcon size={18} /> Insights</div>
        </div>

        {activeTab === "home" && (
          <>
            <SectionTitle
              eyebrow="Ledger"
              title="Recent activity"
              action={<button className="btn-chip" onClick={() => setActiveTab("history")}>View all <ChevronRight size={13} /></button>}
            />
            <div className="panel">
              {transactions.slice(0, 6).map((t) => <TransactionRow key={t.id} tx={t} accountName={accName(t.accountId)} />)}
            </div>
          </>
        )}

        {activeTab === "transfer" && (
          <>
            <SectionTitle eyebrow="Payments" title="Transfer money" />
            <TransferPanel accounts={accounts} onTransfer={handleTransfer} transfers={transfers} />
            <div className="mt-6">
              <BillsPanel bills={bills} onPay={handlePayBill} />
            </div>
          </>
        )}

        {activeTab === "bills" && (
          <>
            <SectionTitle eyebrow="Payments" title="Bills" />
            <BillsPanel bills={bills} onPay={handlePayBill} />
          </>
        )}

        {activeTab === "insights" && (
          <>
            <SectionTitle eyebrow="This month" title="Spending insights" />
            <InsightsPanel transactions={transactions} />
          </>
        )}

        {activeTab === "cards" && (
          <>
            <SectionTitle eyebrow="Wallet" title="Cards" />
            <div className="grid gap-6 md:grid-cols-2">
              {accounts.filter((a) => a.type !== "savings").map((a) => (
                <CardVisual
                  key={a.id}
                  account={a}
                  card={cards[a.id] || { frozen: false, limit: null }}
                  cardholderName={user.name}
                  revealed={!!revealed[a.id]}
                  onReveal={() => setRevealed((p) => ({ ...p, [a.id]: !p[a.id] }))}
                  onToggleFreeze={() => handleToggleFreeze(a.id)}
                  onLimitChange={(limit) => handleLimitChange(a.id, limit)}
                />
              ))}
            </div>
          </>
        )}

        {activeTab === "history" && (
          <>
            <SectionTitle eyebrow="Ledger" title="Transaction history" />
            <HistoryPanel transactions={transactions} accounts={accounts} />
          </>
        )}

        {activeTab === "admin" && user.role === "admin" && (
          <>
            <SectionTitle eyebrow="Control" title="User administration" />
            <AdminPanel showToast={showToast} />
          </>
        )}
      </div>

      <div className="bottom-nav flex md:hidden">
        {navItems.map((item) => (
          <button key={item.id} className={`bottom-nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}>
            <item.icon size={19} />
            {item.label}
          </button>
        ))}
      </div>

      {toast && (
        <div className="toast">
          <Check size={15} style={{ color: COLORS.pos }} /> {toast}
        </div>
      )}
    </>
  );
}

export default function BankingApp() {
  const [user, setUser] = useState(() => api.getStoredUser());
  const [authView, setAuthView] = useState("login");

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener("sable:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("sable:unauthorized", handleUnauthorized);
  }, []);

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setAuthView("login");
  };

  let content;
  if (user) {
    content = <Dashboard user={user} onLogout={handleLogout} />;
  } else if (authView === "register") {
    content = <RegisterScreen onSwitchToLogin={() => setAuthView("login")} />;
  } else {
    content = <LoginScreen onLogin={setUser} onSwitchToRegister={() => setAuthView("register")} />;
  }

  return (
    <div className="app-root font-body">
      <style>{GLOBAL_CSS}</style>
      {content}
    </div>
  );
}
