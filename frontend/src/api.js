const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export const api = {
  getAccounts: () => request("/api/accounts"),
  getTransactions: () => request("/api/transactions"),
  getBills: () => request("/api/bills"),
  getTransfers: () => request("/api/transfers"),
  getCards: () => request("/api/cards"),
  createTransfer: (payload) =>
    request("/api/transfers", { method: "POST", body: JSON.stringify(payload) }),
  payBill: (id) => request(`/api/bills/${id}/pay`, { method: "POST" }),
  patchCard: (accountId, payload) =>
    request(`/api/cards/${accountId}`, { method: "PATCH", body: JSON.stringify(payload) }),
};
