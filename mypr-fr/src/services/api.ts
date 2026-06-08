const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

interface ApiOptions {
  skipAuth?: boolean;
  headers?: Record<string, string>;
}

export async function apiFetch<T = any>(
  path: string,
  body?: any,
  options: ApiOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (!options.skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(API_URL + path, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorMsg: string;
    try {
      const errData = await res.json();
      errorMsg = errData.message || errData.error || `Error ${res.status}`;
    } catch {
      errorMsg = (await res.text().catch(() => '')) || `Error ${res.status}`;
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function apiFetchRaw(
  path: string,
  body: any,
  options: ApiOptions = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (!options.skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return fetch(API_URL + path, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
