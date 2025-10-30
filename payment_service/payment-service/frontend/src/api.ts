// API Configuration
// Update this to point to your C# Payment Service
export const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5004';
// VNPay API removed - not in use

let authToken: string | null = null;
export function setAuthToken(token: string | null) { authToken = token }

let useMock = false;
export function setMockMode(enabled: boolean) { useMock = enabled }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(apiBase + path, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// Costshare
export const getCostSharesByGroup = (groupId: string, page = 1, pageSize = 20) =>
  useMock
    ? Promise.resolve([
        {
          id: crypto.randomUUID(),
          groupId,
          vehicleId: crypto.randomUUID(),
          costType: 0,
          title: 'Bảo dưỡng định kỳ',
          totalAmount: 1200000,
          currency: 'VND',
          dueDate: new Date().toISOString(),
        },
      ])
    : request(`/api/CostShares/group/${groupId}?page=${page}&pageSize=${pageSize}`);

export const createCostShare = (payload: any) =>
  useMock
    ? Promise.resolve({ ...payload, id: crypto.randomUUID() })
    : request('/api/CostShares', { method: 'POST', body: JSON.stringify(payload) });

// Payments
export const createPayment = (payload: any) =>
  useMock
    ? Promise.resolve({
        ...payload,
        id: crypto.randomUUID(),
        status: 0,
      })
    : request('/api/Payments', { method: 'POST', body: JSON.stringify(payload) });

export const getPaymentsByUser = (userId: string, page = 1, pageSize = 20) =>
  useMock
    ? Promise.resolve([
        { id: crypto.randomUUID(), method: 2, amount: 100000, currency: 'VND', status: 1 },
        { id: crypto.randomUUID(), method: 3, amount: 250000, currency: 'VND', status: 2 },
      ])
    : request(`/api/Payments/user/${userId}?page=${page}&pageSize=${pageSize}`);

// VNPay Payment
export const vnpayApiBase = 'http://localhost:3001';

export const createVNPayPayment = async (payload: {
  amount: number;
  orderId: string;
  orderInfo: string;
  orderType?: string;
  bankCode?: string;
  locale?: string;
  costShareDetailId?: string;
  walletId?: string;
}) => {
  const res = await fetch(`${vnpayApiBase}/api/vnpay/create-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return await res.json();
};

export const getVNPayPaymentStatus = async (orderId: string) => {
  const res = await fetch(`${vnpayApiBase}/api/vnpay/payment-status/${orderId}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return await res.json();
};

