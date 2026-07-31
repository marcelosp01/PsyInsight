import { useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { DocumentForm } from '../components/DocumentForm'
import { DocumentPreview } from '../components/DocumentPreview'
import type { DocumentType } from '../types/document'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string>('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [touchedKeys, setTouchedKeys] = useState<Set<string>>(new Set())
  const [isLoadingTypes, setIsLoadingTypes] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

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
    if (!user) return
    setValues((current) => ({
      ...current,
      profissional_nome: current.profissional_nome || user.name,
      profissional_crp: current.profissional_crp || user.crp,
    }))
  }, [user])

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

  const handleChange = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const handleBlur = (key: string) => {
    setTouchedKeys((current) => new Set(current).add(key))
  }

  const markAllTouched = () => {
    if (!selectedType) return
    setTouchedKeys(new Set(selectedType.fields.map((field) => field.key)))
  }

  const handleDownload = async () => {
    if (!selectedType) return
    markAllTouched()
    if (missingRequiredFields.length > 0) {
      setDownloadError('Preencha todos os campos obrigatórios antes de baixar o PDF.')
      return
    }

    setDownloadError(null)
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
    markAllTouched()
    if (missingRequiredFields.length > 0) {
      setDownloadError('Preencha todos os campos obrigatórios antes de imprimir.')
      return
    }
    setDownloadError(null)
    window.print()
  }

  if (isLoadingTypes) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">Carregando...</div>
    )
  }

  return (
    <div className="min-h-screen bg-sage-50">
      <header className="print-hide border-b border-sage-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">PsyInsight</h1>
            <p className="text-sm text-slate-500">Olá, {user?.name}</p>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-lg border border-sage-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-sage-100"
          >
            Sair
          </button>
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
            onChange={(e) => {
              setSelectedSlug(e.target.value)
              setTouchedKeys(new Set())
              setDownloadError(null)
            }}
            className="mt-1 w-full max-w-md rounded-lg border border-sage-200 bg-white px-3 py-2 text-slate-800 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500 sm:w-auto"
          >
            {documentTypes.map((type) => (
              <option key={type.slug} value={type.slug}>
                {type.name} ({type.article})
              </option>
            ))}
          </select>
          {selectedType && <p className="mt-2 max-w-2xl text-sm text-slate-500">{selectedType.description}</p>}
        </div>

        {selectedType && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <section className="print-hide">
              <h2 className="mb-4 text-base font-semibold text-slate-700">Dados do documento</h2>
              <DocumentForm
                fields={selectedType.fields}
                values={values}
                touchedKeys={touchedKeys}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </section>

            <section>
              <div className="print-hide mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-700">Pré-visualização</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="rounded-lg border border-sage-300 px-4 py-2 text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    Imprimir
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-60"
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
    </div>
  )
}
