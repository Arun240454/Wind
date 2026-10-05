'use client';

export class ClientApiError extends Error {
  constructor(
    message: string,
    public fields?: Record<string, string[] | undefined>
  ) {
    super(message);
  }
}

/** fetch wrapper for client components: JSON in, JSON out, API errors thrown with their message. */
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body || opts.form ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ClientApiError(data?.error?.message ?? `Request failed (${res.status})`, data?.error?.fields);
  }
  return data as T;
}
