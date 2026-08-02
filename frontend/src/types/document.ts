export type FieldKind = 'text' | 'textarea' | 'date'

export interface DocumentField {
  key: string
  label: string
  kind: FieldKind
  required: boolean
  help_text: string | null
}

export interface DocumentType {
  slug: string
  name: string
  article: string
  description: string
  fields: DocumentField[]
}

export interface User {
  id: number
  name: string
  email: string
  crp: string
  created_at: string
}

export interface SavedDocumentSummary {
  id: number
  title: string
  document_type: string
  updated_at: string
}

export interface SavedDocument extends SavedDocumentSummary {
  values: Record<string, string>
  created_at: string
}
