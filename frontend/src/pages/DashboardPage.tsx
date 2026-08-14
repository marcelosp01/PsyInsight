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
  const [conversationKey, setConversationKey] = useState(0)

  useEffect(() => {
    api
      .documentTypes()
      .then(setDocumentTypes)
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

  const handleDocumentTypeResolved = (type: DocumentType) => {
    setSelectedSlug(type.slug)
  }

  const handleStartNewDocument = () => {
    setSelectedSlug('')
    setValues({})
    setDownloadError(null)
    setSavedDocumentId(null)
    setSavedDocumentTitle('')
    setLoadError(null)
    setSearchParams({})
    setConversationKey((key) => key + 1)
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
            <button
              onClick={handleStartNewDocument}
              className="rounded-lg border border-nude-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-nude-100"
            >
              Novo laudo
            </button>
            <Link
              to="/meus-laudos"
              className="rounded-lg border border-nude-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-nude-100"
            >
              Meus Laudos
            </Link>
            <Link
              to="/perfil"
              className="rounded-lg border border-nude-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-nude-100"
            >
              Meu Perfil
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
        {(savedDocumentTitle || loadError || saveConfirmation) && (
          <div className="print-hide mb-6">
            {savedDocumentTitle && (
              <p className="text-sm text-nude-700">
                Editando laudo salvo: <span className="font-medium">{savedDocumentTitle}</span>
              </p>
            )}
            {loadError && <p className="mt-2 text-sm text-red-700">{loadError}</p>}
            {saveConfirmation && <p className="mt-2 text-sm text-nude-700">{saveConfirmation}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <section className="print-hide">
            <h2 className="mb-4 flex h-10 items-center text-base font-semibold text-slate-700">Entrevista</h2>
            <ChatPanel
              key={`${savedDocumentId ?? 'new'}-${conversationKey}`}
              documentTypes={documentTypes}
              initialDocumentType={selectedType}
              savedDocumentId={savedDocumentId}
              chatInputSize={user?.chat_input_size}
              chatFontSize={user?.chat_font_size}
              onDocumentTypeChange={handleDocumentTypeResolved}
              onValuesUpdate={setValues}
            />
          </section>

          <section>
            <div className="print-hide mb-4 flex h-10 flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-700">Pré-visualização</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleOpenSaveModal}
                  disabled={!selectedType}
                  className="rounded-lg border border-nude-300 px-4 py-2 text-sm font-medium text-nude-700 hover:bg-nude-100 disabled:opacity-60"
                >
                  Salvar
                </button>
                <button
                  onClick={handlePrint}
                  disabled={!selectedType}
                  className="rounded-lg border border-nude-300 px-4 py-2 text-sm font-medium text-nude-700 hover:bg-nude-100 disabled:opacity-60"
                >
                  Imprimir
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!selectedType || isDownloading}
                  className="rounded-lg bg-nude-600 px-4 py-2 text-sm font-medium text-white hover:bg-nude-700 disabled:opacity-60"
                >
                  {isDownloading ? 'Gerando...' : 'Baixar PDF'}
                </button>
              </div>
            </div>
            {downloadError && (
              <p className="print-hide mb-3 text-sm text-red-700">{downloadError}</p>
            )}
            {selectedType ? (
              <DocumentPreview documentType={selectedType} values={values} />
            ) : (
              <div className="flex h-[75vh] items-center justify-center rounded-lg border border-dashed border-nude-300 bg-white/60 p-10 text-center text-sm text-slate-500">
                A pré-visualização aparece assim que a modalidade do documento for definida na
                conversa ao lado.
              </div>
            )}
          </section>
        </div>
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
