import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ChatPanel } from '../components/ChatPanel'
import { DocumentPreview } from '../components/DocumentPreview'
import { SaveDocumentModal } from '../components/SaveDocumentModal'
import type { DocumentType } from '../types/document'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string>('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [isLoadingTypes, setIsLoadingTypes] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const [savedDocumentId, setSavedDocumentId] = useState<number | null>(null)
  const [savedDocumentTitle, setSavedDocumentTitle] = useState<string>('')
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    api
      .documentTypes()
      .then((types) => {
        setDocumentTypes(types)
        setSelectedSlug((current) => current || types[0]?.slug || '')
      })
      .finally(() => setIsLoadingTypes(false))
  }, [])

  useEffect(() => {
    const laudoId = searchParams.get('laudoId')
    if (!laudoId) return
    let ignore = false
    setLoadError(null)
    api.savedDocuments
      .get(Number(laudoId))
      .then((document) => {
        if (ignore) return
        setSelectedSlug(document.document_type)
        setValues(document.values)
        setSavedDocumentId(document.id)
        setSavedDocumentTitle(document.title)
      })
      .catch((err) => {
        if (ignore) return
        setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar o laudo salvo.')
      })
    return () => {
      ignore = true
    }
  }, [searchParams])

  const selectedType = useMemo(
    () => documentTypes.find((type) => type.slug === selectedSlug) ?? null,
    [documentTypes, selectedSlug],
  )

  const missingRequiredFields = useMemo(() => {
    if (!selectedType) return []
    return selectedType.fields.filter(
      (field) => field.required && !(values[field.key] ?? '').trim(),
    )
  }, [selectedType, values])

  const ensureRequiredFieldsFilled = (actionLabel: string): boolean => {
    if (missingRequiredFields.length > 0) {
      setDownloadError(
        `A conversa ainda precisa cobrir todos os campos obrigatórios antes de ${actionLabel}.`,
      )
      return false
    }
    setDownloadError(null)
    return true
  }

  const handleDocumentTypeChange = (slug: string) => {
    setSelectedSlug(slug)
    setValues({})
    setDownloadError(null)
    setSavedDocumentId(null)
    setSavedDocumentTitle('')
    setSearchParams({})
  }

  const handleDownload = async () => {
    if (!selectedType) return
    if (!ensureRequiredFieldsFilled('baixar o PDF')) return

    setIsDownloading(true)
    try {
      const blob = await api.generatePdf(selectedType.slug, values)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${selectedType.slug}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : 'Não foi possível gerar o PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePrint = () => {
    if (!ensureRequiredFieldsFilled('imprimir')) return
    window.print()
  }

  const handleOpenSaveModal = () => {
    if (!selectedType) return
    if (!ensureRequiredFieldsFilled('salvar')) return
    setSaveError(null)
    setIsSaveModalOpen(true)
  }

  const handleConfirmSave = async (title: string) => {
    if (!selectedType) return
    const isCreating = savedDocumentId === null
    setIsSaving(true)
    setSaveError(null)
    try {
      const saved = savedDocumentId
        ? await api.savedDocuments.update(savedDocumentId, { title, values })
        : await api.savedDocuments.create({ title, document_type: selectedType.slug, values })
      setSavedDocumentId(saved.id)
      setSavedDocumentTitle(saved.title)
      if (isCreating) {
        setSearchParams({ laudoId: String(saved.id) })
      }
      setIsSaveModalOpen(false)
      setSaveConfirmation(`"${saved.title}" salvo em Meus Laudos.`)
      setTimeout(() => setSaveConfirmation(null), 4000)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Não foi possível salvar o laudo.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoadingTypes) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">Carregando...</div>
    )
  }

  return (
    <div className="min-h-screen bg-nude-50">
      <header className="print-hide border-b border-nude-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">PsyInsight</h1>
            <p className="text-sm text-slate-500">Olá, {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/meus-laudos"
              className="rounded-lg border border-nude-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-nude-100"
            >
              Meus Laudos
            </Link>
            <button
              onClick={() => logout()}
              className="rounded-lg border border-nude-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-nude-100"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="print-hide mb-6">
          <label htmlFor="document-type" className="block text-sm font-medium text-slate-700">
            Modalidade do documento
          </label>
          <select
            id="document-type"
            value={selectedSlug}
            onChange={(e) => handleDocumentTypeChange(e.target.value)}
            className="mt-1 w-full max-w-md rounded-lg border border-nude-200 bg-white px-3 py-2 text-slate-800 focus:border-nude-500 focus:outline-none focus:ring-1 focus:ring-nude-500 sm:w-auto"
          >
            {documentTypes.map((type) => (
              <option key={type.slug} value={type.slug}>
                {type.name} ({type.article})
              </option>
            ))}
          </select>
          {selectedType && <p className="mt-2 max-w-2xl text-sm text-slate-500">{selectedType.description}</p>}
          {savedDocumentTitle && (
            <p className="print-hide mt-2 text-sm text-nude-700">
              Editando laudo salvo: <span className="font-medium">{savedDocumentTitle}</span>
            </p>
          )}
          {loadError && <p className="print-hide mt-2 text-sm text-red-700">{loadError}</p>}
          {saveConfirmation && (
            <p className="print-hide mt-2 text-sm text-nude-700">{saveConfirmation}</p>
          )}
        </div>

        {selectedType && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <section className="print-hide">
              <h2 className="mb-4 text-base font-semibold text-slate-700">Entrevista</h2>
              <ChatPanel
                key={`${selectedType.slug}-${savedDocumentId ?? 'new'}`}
                documentType={selectedType}
                savedDocumentId={savedDocumentId}
                onValuesUpdate={setValues}
              />
            </section>

            <section>
              <div className="print-hide mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-700">Pré-visualização</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleOpenSaveModal}
                    className="rounded-lg border border-nude-300 px-4 py-2 text-sm font-medium text-nude-700 hover:bg-nude-100"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={handlePrint}
                    className="rounded-lg border border-nude-300 px-4 py-2 text-sm font-medium text-nude-700 hover:bg-nude-100"
                  >
                    Imprimir
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="rounded-lg bg-nude-600 px-4 py-2 text-sm font-medium text-white hover:bg-nude-700 disabled:opacity-60"
                  >
                    {isDownloading ? 'Gerando...' : 'Baixar PDF'}
                  </button>
                </div>
              </div>
              {downloadError && (
                <p className="print-hide mb-3 text-sm text-red-700">{downloadError}</p>
              )}
              <DocumentPreview documentType={selectedType} values={values} />
            </section>
          </div>
        )}
      </main>

      {isSaveModalOpen && (
        <SaveDocumentModal
          initialTitle={savedDocumentTitle || `${selectedType?.name ?? ''} - ${new Date().toLocaleDateString('pt-BR')}`}
          isSaving={isSaving}
          error={saveError}
          onCancel={() => setIsSaveModalOpen(false)}
          onConfirm={handleConfirmSave}
        />
      )}
    </div>
  )
}
