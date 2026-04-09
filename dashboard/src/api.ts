const API_BASE = '/api';
const TOKEN_KEY = 'penny_auth_token';

// Restore token from localStorage on load
let authToken: string | null = localStorage.getItem(TOKEN_KEY);

export function setToken(token: string) {
  authToken = token;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return authToken;
}

export function clearToken() {
  authToken = null;
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers || {}) },
  });

  if (!res.ok) {
    // If 401, clear the stored token
    if (res.status === 401) {
      clearToken();
    }
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  verifyAuth: () => request<any>('/auth/verify'),
  getSummary: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/dashboard/summary${qs}`);
  },
  getTransactions: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/transactions${qs}`);
  },
  getStats: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/stats${qs}`);
  },
  updateTransaction: (id: number, data: any) =>
    request<any>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: number) =>
    request<any>(`/transactions/${id}`, { method: 'DELETE' }),
  getPersona: () => request<any>('/persona'),
  updatePersona: (data: any) =>
    request<any>('/persona', { method: 'PUT', body: JSON.stringify(data) }),
  createZaloLinkCode: () =>
    request<any>('/link/zalo-code', { method: 'POST', body: JSON.stringify({}) }),
  uploadPdfImport: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}/import/pdf`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  },

  // Admin
  checkAdmin: () => request<any>('/admin/check').catch(() => ({ isAdmin: false })),
  getAdminUsers: () => request<any>('/admin/users'),
  broadcastText: (message: string, userIds?: number[], parseMode?: string) =>
    request<any>('/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify({ message, userIds, parseMode }),
    }),
  broadcastImage: (imageUrl: string, caption?: string, userIds?: number[], parseMode?: string) =>
    request<any>('/admin/broadcast-image', {
      method: 'POST',
      body: JSON.stringify({ imageUrl, caption, userIds, parseMode }),
    }),
  broadcastImageUpload: async (file: File, caption?: string, userIds?: number[], parseMode?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (caption) formData.append('caption', caption);
    if (userIds) formData.append('userIds', JSON.stringify(userIds));
    if (parseMode) formData.append('parseMode', parseMode);

    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}/admin/broadcast-image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
  broadcastAI: (message: string, userIds?: number[]) =>
    request<any>('/admin/broadcast-ai', {
      method: 'POST',
      body: JSON.stringify({ message, userIds }),
    }),
};
