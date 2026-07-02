const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const TOKEN_KEY = "sable_token";
const USER_KEY = "sable_user";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (res.status === 401) {
    clearSession();
    window.dispatchEvent(new Event("sable:unauthorized"));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export const api = {
  login: (email, password) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name, email, password) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  saveSession: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  logout: clearSession,
  getStoredUser,

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

  admin: {
    listUsers: () => request("/api/admin/users"),
    approveUser: (id) => request(`/api/admin/users/${id}/approve`, { method: "POST" }),
    rejectUser: (id) => request(`/api/admin/users/${id}/reject`, { method: "POST" }),
    adjustAccount: (userId, accountId, direction, amount, note) =>
      request(`/api/admin/users/${userId}/accounts/${accountId}/adjust`, {
        method: "POST",
        body: JSON.stringify({ direction, amount, note }),
      }),
  },
};
