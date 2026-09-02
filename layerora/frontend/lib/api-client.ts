import { getSession } from 'next-auth/react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

type ApiOptions = RequestInit & {
  auth?: boolean;
};

async function request<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { auth = true, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);

  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth) {
    const session = await getSession();

    if (session?.accessToken) {
      headers.set('Authorization', `Bearer ${session.accessToken}`);
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'API request failed';

    try {
      const error = await response.json();
      message = error.detail || error.message || message;
    } catch {}

    console.error('API Error:', response.status, message);
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'GET',
    }),

  post: <T>(
    endpoint: string,
    body?: unknown,
    options?: ApiOptions
  ) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    }),

  put: <T>(
    endpoint: string,
    body?: unknown,
    options?: ApiOptions
  ) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    }),

  patch: <T>(
    endpoint: string,
    body?: unknown,
    options?: ApiOptions
  ) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    }),

  delete: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    }),
};