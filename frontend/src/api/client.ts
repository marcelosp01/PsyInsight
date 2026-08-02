import type { ChatSession, DocumentType, SavedDocument, SavedDocumentSummary, User } from '../types/document'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return
  let detail = response.statusText
  try {
    const body = await response.json()
    detail = body.detail ?? detail
  } catch {
    // response had no JSON body
  }
  throw new ApiError(detail, response.status)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  await throwIfNotOk(response)

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export interface SignupPayload {
  name: string
  email: string
  crp: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export const api = {
  signup: (payload: SignupPayload) =>
    request<User>('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload: LoginPayload) =>
    request<User>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),

  me: () => request<User>('/api/auth/me'),

  documentTypes: () => request<DocumentType[]>('/api/documents/types'),

  savedDocuments: {
    list: () => request<SavedDocumentSummary[]>('/api/documents/saved'),

    get: (id: number) => request<SavedDocument>(`/api/documents/saved/${id}`),

    create: (payload: { title: string; document_type: string; values: Record<string, string> }) =>
      request<SavedDocument>('/api/documents/saved', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    update: (id: number, payload: { title?: string; values?: Record<string, string> }) =>
      request<SavedDocument>(`/api/documents/saved/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    remove: (id: number) => request<void>(`/api/documents/saved/${id}`, { method: 'DELETE' }),
  },

  chat: {
    createOrResumeSession: (payload: { document_type: string; saved_document_id?: number | null }) =>
      request<ChatSession>('/api/chat/sessions', { method: 'POST', body: JSON.stringify(payload) }),

    async sendMessage(sessionId: number, content: string | null): Promise<Response> {
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      await throwIfNotOk(response)
      return response
    },
  },

  async generatePdf(documentType: string, values: Record<string, string>): Promise<Blob> {
    const response = await fetch('/api/documents/pdf', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_type: documentType, values }),
    })

    await throwIfNotOk(response)

    return response.blob()
  },
}
