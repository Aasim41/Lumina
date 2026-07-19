import { getToken, logout } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Only set Content-Type to application/json if not FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.detail || data.message || 'API Error');
  }
  
  return data;
}

export const guestLogin = (data: { name: string, age: number, dob: string, monthly_budget: number }) => 
  apiFetch('/api/auth/guest', {
    method: 'POST',
    body: JSON.stringify(data)
  });

export const uploadCSV = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
};

export const uploadReceipt = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/api/upload/receipt', {
    method: 'POST',
    body: formData,
  });
};

export const getSubscriptions = () => {
  return apiFetch('/api/subscriptions/');
};

export const deleteSubscription = (id: string) => {
  return apiFetch(`/api/subscriptions/${id}`, {
    method: 'DELETE',
  });
};

export const createSubscription = (data: any) => {
  return apiFetch('/api/subscriptions/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const exportCSV = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/analytics/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  
  if (!response.ok) throw new Error('Failed to export');
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions_export.csv';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const exportPDF = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/analytics/export/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  
  if (!response.ok) throw new Error('Failed to export PDF');
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transaction_history.pdf';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const getTransactions = (params?: URLSearchParams) => {
  const queryString = params ? `?${params.toString()}` : '';
  return apiFetch(`/api/transactions${queryString}`);
};

export const createTransaction = (data: any) => 
  apiFetch('/api/transactions/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateTransaction = (id: string, data: any) => 
  apiFetch(`/api/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteTransaction = (id: string) => 
  apiFetch(`/api/transactions/${id}`, {
    method: 'DELETE',
  });

export const getSummary = () => apiFetch('/api/analytics/summary');
export const getCategories = () => apiFetch('/api/analytics/categories');
export const getTrends = () => apiFetch('/api/analytics/trends');
export const getHeatmap = () => apiFetch('/api/analytics/heatmap');
export const getTopMerchants = () => apiFetch('/api/analytics/top-merchants');
export const getForecast = () => apiFetch('/api/forecast/');
export const getUserProfile = () => apiFetch('/api/users/me');
export const updateUserProfile = (data: any) => apiFetch('/api/users/me', {
  method: 'PATCH',
  body: JSON.stringify(data),
});

export const getMysteryEnvelope = () => apiFetch('/api/mystery-envelope');
export const openMysteryEnvelope = () => apiFetch('/api/mystery-envelope/open', { method: 'POST' });
export const getRoast = (data: { amount: number, category: string, merchant: string }) => apiFetch('/api/roast', {
  method: 'POST',
  body: JSON.stringify(data),
});

// Insights
export const getInsights = () => {
  return apiFetch('/api/insights/');
};


// Wishlist
export const getWishlist = () => apiFetch('/api/wishlist/');
export const createWishlistItem = (data: { name: string; price: number; priority: string; image_url?: string; link_url?: string; }) =>
  apiFetch('/api/wishlist/', { method: 'POST', body: JSON.stringify(data) });
export const markWishlistPurchased = (id: string) =>
  apiFetch(`/api/wishlist/${id}`, { method: 'PATCH' });
export const deleteWishlistItem = (id: string) =>
  apiFetch(`/api/wishlist/${id}`, { method: 'DELETE' });

// Splits
export const getSplits = () => apiFetch('/api/splits/');
export const getBalances = () => apiFetch('/api/splits/balances');
export const createSplit = (data: any) =>
  apiFetch('/api/splits/', { method: 'POST', body: JSON.stringify(data) });
export const toggleSplitMemberPaid = (billId: string, memberId: string) =>
  apiFetch(`/api/splits/${billId}/members/${memberId}`, { method: 'PATCH' });
export const deleteSplit = (id: string) =>
  apiFetch(`/api/splits/${id}`, { method: 'DELETE' });

// Currency
export const getCurrencyRates = () => apiFetch('/api/currency/rates');
export const convertCurrency = (amount: number, from: string) =>
  apiFetch(`/api/currency/convert?amount=${amount}&from_currency=${from}`);

// Budgets
export const getCategoryBudgets = () => apiFetch('/api/budgets/');
export const createCategoryBudget = (data: { category: string, amount: number }) => 
  apiFetch('/api/budgets/', { method: 'POST', body: JSON.stringify(data) });
export const updateCategoryBudget = (id: string, data: { amount: number }) =>
  apiFetch(`/api/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// Settings endpoints
export const updateSettings = async (data: any) => apiFetch('/api/settings', { method: 'PATCH', body: JSON.stringify(data) });
export const updateBudget = async (monthly_budget: number) => apiFetch('/api/settings/budget', { method: 'PATCH', body: JSON.stringify({ monthly_budget }) });

// Debts endpoints
export const getDebts = async () => apiFetch('/api/debts');
export const createDebt = async (data: any) => apiFetch('/api/debts', { method: 'POST', body: JSON.stringify(data) });
export const updateDebt = async (id: string, data: any) => apiFetch(`/api/debts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteDebt = async (id: string) => apiFetch(`/api/debts/${id}`, { method: 'DELETE' });

// Investments endpoints
export const getInvestments = async () => apiFetch('/api/investments');
export const createInvestment = async (data: any) => apiFetch('/api/investments', { method: 'POST', body: JSON.stringify(data) });
export const updateInvestment = async (id: string, data: any) => apiFetch(`/api/investments/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteInvestment = async (id: string) => apiFetch(`/api/investments/${id}`, { method: 'DELETE' });

export const deleteCategoryBudget = (id: string) =>
  apiFetch(`/api/budgets/${id}`, { method: 'DELETE' });
