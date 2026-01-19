let csrfTokenCache = null;

export async function getCsrfToken() {
  if (csrfTokenCache) return csrfTokenCache;

  const res = await fetch('/api/admin/csrf', { credentials: 'include' });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.success || !data?.token) {
    throw new Error(data?.message || `Error obteniendo CSRF (${res.status})`);
  }

  csrfTokenCache = data.token;
  return csrfTokenCache;
}

export function clearCsrfToken() {
  csrfTokenCache = null;
}

export async function csrfFetch(input, init = {}) {
  const token = await getCsrfToken();

  const headers = new Headers(init.headers || {});
  headers.set('X-CSRF-Token', token);

  const nextInit = {
    ...init,
    credentials: 'include',
    headers
  };

  return fetch(input, nextInit);
}

