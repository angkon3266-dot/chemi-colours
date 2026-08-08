/**
 * Thin fetch wrapper around the PHP API.
 * Cookies carry the admin session; mutations carry the CSRF header.
 */

const BASE = '/api'

let csrfToken = ''

export function setCsrf(token: string) {
  csrfToken = token
}

export function getCsrf() {
  return csrfToken
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isForm = false
): Promise<T> {
  const headers: Record<string, string> = {}
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken

  const res = await fetch(BASE + path, {
    method,
    headers,
    credentials: 'same-origin',
    body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data: any = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new ApiError('The server returned an unexpected response.', res.status)
    }
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status)
  }
  return data as T
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b),
  put: <T>(p: string, b?: unknown) => request<T>('PUT', p, b),
  patch: <T>(p: string, b?: unknown) => request<T>('PATCH', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
  upload: <T>(p: string, form: FormData) => request<T>('POST', p, form, true),
}
