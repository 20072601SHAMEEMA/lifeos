import { storage, KEYS } from '../utils/storage.js';

/**
 * Centralised REST client. Every service goes through here, so swapping the
 * backend URL (VITE_API_URL) or auth strategy only touches this file.
 */
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, status = 0, fields = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields || null;
  }
}

let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

const OFFLINE_MSG = 'Cannot reach the LifeOS server. Check your connection or make sure the backend is running.';

export async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = storage.get(KEYS.token);
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(OFFLINE_MSG, 0);
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && auth && token && unauthorizedHandler) unauthorizedHandler();
    const fallback = res.status >= 500 && !data ? OFFLINE_MSG : `Request failed (${res.status}).`;
    throw new ApiError(data?.error || fallback, res.status, data?.fields);
  }
  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body: body ?? {} }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body: body ?? {} }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body: body ?? {} }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};
