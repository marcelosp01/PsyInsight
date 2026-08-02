import { useState, type FormEvent } from 'react'

interface SaveDocumentModalProps {
  initialTitle: string
  isSaving: boolean
  error: string | null
  onCancel: () => void
  onConfirm: (title: string) => void
}

export function SaveDocumentModal({
  initialTitle,
  isSaving,
  error,
  onCancel,
  onConfirm,
}: SaveDocumentModalProps) {
  const [title, setTitle] = useState(initialTitle)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    onConfirm(title.trim())
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-800">Salvar laudo</h2>
        <p className="mt-1 text-sm text-slate-500">
          Dê um nome para encontrar este laudo depois em "Meus Laudos".
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="saved-document-title" className="block text-sm font-medium text-slate-700">
              Título
            </label>
            <input
              id="saved-document-title"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-nude-200 px-3 py-2 text-slate-800 focus:border-nude-500 focus:outline-none focus:ring-1 focus:ring-nude-500"
            />
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-nude-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-nude-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-nude-600 px-4 py-2 text-sm font-medium text-white hover:bg-nude-700 disabled:opacity-60"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
