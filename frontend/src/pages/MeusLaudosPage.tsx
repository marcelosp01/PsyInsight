import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { DocumentType, SavedDocumentSummary } from '../types/document'

export function MeusLaudosPage() {
  const [documents, setDocuments] = useState<SavedDocumentSummary[]>([])
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.savedDocuments.list(), api.documentTypes()])
      .then(([savedDocuments, types]) => {
        setDocuments(savedDocuments)
        setDocumentTypes(types)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar seus laudos.'))
      .finally(() => setIsLoading(false))
  }, [])

  const typeNameBySlug = useMemo(
    () => new Map(documentTypes.map((type) => [type.slug, type.name])),
    [documentTypes],
  )

  const startRenaming = (document: SavedDocumentSummary) => {
    setRenamingId(document.id)
    setRenameValue(document.title)
    setRenameError(null)
  }

  const cancelRenaming = () => {
    setRenamingId(null)
    setRenameError(null)
  }

  const confirmRenaming = async (id: number) => {
    if (!renameValue.trim()) return
    try {
      const updated = await api.savedDocuments.update(id, { title: renameValue.trim() })
      setDocuments((current) => current.map((doc) => (doc.id === id ? updated : doc)))
      setRenamingId(null)
    } catch (err) {
      setRenameError(err instanceof ApiError ? err.message : 'Não foi possível renomear o laudo.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Excluir este laudo salvo? Esta ação não pode ser desfeita.')) return
    try {
      await api.savedDocuments.remove(id)
      setDocuments((current) => current.filter((doc) => doc.id !== id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir o laudo.')
    }
  }

  return (
    <div className="min-h-screen bg-nude-50">
      <header className="border-b border-nude-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold text-slate-800">Meus Laudos</h1>
          <Link
            to="/"
            className="rounded-lg border border-nude-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-nude-100"
          >
            Novo laudo
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-6">
        {isLoading && <p className="text-slate-500">Carregando...</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}

        {!isLoading && documents.length === 0 && !error && (
          <p className="text-slate-500">
            Você ainda não salvou nenhum laudo. Preencha um documento e clique em "Salvar".
          </p>
        )}

        <ul className="space-y-3">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-nude-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                {renamingId === document.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="rounded-lg border border-nude-200 px-2 py-1 text-sm text-slate-800 focus:border-nude-500 focus:outline-none focus:ring-1 focus:ring-nude-500"
                    />
                    <button
                      onClick={() => confirmRenaming(document.id)}
                      className="rounded-lg bg-nude-600 px-3 py-1 text-sm font-medium text-white hover:bg-nude-700"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={cancelRenaming}
                      className="rounded-lg border border-nude-200 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-nude-100"
                    >
                      Cancelar
                    </button>
                    {renameError && <p className="w-full text-sm text-red-700">{renameError}</p>}
                  </div>
                ) : (
                  <>
                    <p className="truncate font-medium text-slate-800">{document.title}</p>
                    <p className="text-sm text-slate-500">
                      {typeNameBySlug.get(document.document_type) ?? document.document_type} · atualizado em{' '}
                      {new Date(document.updated_at).toLocaleString('pt-BR')}
                    </p>
                  </>
                )}
              </div>

              {renamingId !== document.id && (
                <div className="flex shrink-0 gap-2">
                  <Link
                    to={`/?laudoId=${document.id}`}
                    className="rounded-lg border border-nude-300 px-3 py-1.5 text-sm font-medium text-nude-700 hover:bg-nude-100"
                  >
                    Abrir
                  </Link>
                  <button
                    onClick={() => startRenaming(document)}
                    className="rounded-lg border border-nude-300 px-3 py-1.5 text-sm font-medium text-nude-700 hover:bg-nude-100"
                  >
                    Renomear
                  </button>
                  <button
                    onClick={() => handleDelete(document.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
