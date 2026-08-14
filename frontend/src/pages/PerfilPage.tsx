import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'
import { LAYOUT_SIZES, LAYOUT_SIZE_LABELS, normalizeLayoutSize, type LayoutSize } from '../lib/layoutPreferences'

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function PerfilPage() {
  const { user, updateProfile, uploadLogo, removeLogo } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [crp, setCrp] = useState(user?.crp ?? '')
  const [localAtendimento, setLocalAtendimento] = useState(user?.local_atendimento ?? '')
  const [chatInputSize, setChatInputSize] = useState<LayoutSize>(normalizeLayoutSize(user?.chat_input_size))
  const [chatFontSize, setChatFontSize] = useState<LayoutSize>(normalizeLayoutSize(user?.chat_font_size))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [isLogoSaving, setIsLogoSaving] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)

  // `user` chega de forma assíncrona (carregado pelo AuthContext após o
  // primeiro render); sincroniza os campos assim que os dados reais chegam.
  useEffect(() => {
    if (!user) return
    setName(user.name)
    setCrp(user.crp)
    setLocalAtendimento(user.local_atendimento)
    setChatInputSize(normalizeLayoutSize(user.chat_input_size))
    setChatFontSize(normalizeLayoutSize(user.chat_font_size))
  }, [user])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      await updateProfile({
        name,
        crp,
        local_atendimento: localAtendimento,
        chat_input_size: chatInputSize,
        chat_font_size: chatFontSize,
      })
      setConfirmation('Perfil atualizado.')
      setTimeout(() => setConfirmation(null), 4000)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível atualizar o perfil.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setLogoError('Formato de imagem não suportado. Use PNG, JPG ou WEBP.')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('A imagem excede o tamanho máximo de 2MB.')
      return
    }

    setLogoError(null)
    setIsLogoSaving(true)
    try {
      await uploadLogo(file)
    } catch (err) {
      setLogoError(err instanceof ApiError ? err.message : 'Não foi possível enviar a logomarca.')
    } finally {
      setIsLogoSaving(false)
    }
  }

  const handleRemoveLogo = async () => {
    setLogoError(null)
    setIsLogoSaving(true)
    try {
      await removeLogo()
    } catch (err) {
      setLogoError(err instanceof ApiError ? err.message : 'Não foi possível remover a logomarca.')
    } finally {
      setIsLogoSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-nude-50">
      <header className="border-b border-nude-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold text-slate-800">Meu Perfil</h1>
          <Link
            to="/"
            className="rounded-lg border border-nude-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-nude-100"
          >
            Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-6">
        <div className="rounded-lg border border-nude-200 bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Nome completo
              </label>
              <input
                id="name"
                required
                minLength={2}
                disabled={isSaving}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-nude-200 px-3 py-2 text-slate-800 focus:border-nude-500 focus:outline-none focus:ring-1 focus:ring-nude-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="crp" className="block text-sm font-medium text-slate-700">
                CRP
              </label>
              <input
                id="crp"
                required
                minLength={2}
                disabled={isSaving}
                value={crp}
                onChange={(e) => setCrp(e.target.value)}
                className="mt-1 w-full rounded-lg border border-nude-200 px-3 py-2 text-slate-800 focus:border-nude-500 focus:outline-none focus:ring-1 focus:ring-nude-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="local_atendimento" className="block text-sm font-medium text-slate-700">
                Local de atendimento
              </label>
              <input
                id="local_atendimento"
                placeholder="Ex.: São Paulo - SP"
                disabled={isSaving}
                value={localAtendimento}
                onChange={(e) => setLocalAtendimento(e.target.value)}
                className="mt-1 w-full rounded-lg border border-nude-200 px-3 py-2 text-slate-800 focus:border-nude-500 focus:outline-none focus:ring-1 focus:ring-nude-500 disabled:opacity-60"
              />
              <p className="mt-1 text-xs text-slate-400">
                Usado para preencher automaticamente o local e a data ao final dos seus documentos.
              </p>
            </div>

            <div className="border-t border-nude-200 pt-4">
              <h2 className="text-sm font-semibold text-slate-700">Preferências do chat</h2>
              <p className="mt-1 text-xs text-slate-400">
                Ajustam o tamanho da caixa de mensagem e da fonte na conversa com a IA.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="chat_input_size" className="block text-sm font-medium text-slate-700">
                    Tamanho da caixa de mensagem
                  </label>
                  <select
                    id="chat_input_size"
                    disabled={isSaving}
                    value={chatInputSize}
                    onChange={(e) => setChatInputSize(e.target.value as LayoutSize)}
                    className="mt-1 w-full rounded-lg border border-nude-200 px-3 py-2 text-slate-800 focus:border-nude-500 focus:outline-none focus:ring-1 focus:ring-nude-500 disabled:opacity-60"
                  >
                    {LAYOUT_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {LAYOUT_SIZE_LABELS[size]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="chat_font_size" className="block text-sm font-medium text-slate-700">
                    Tamanho da fonte do chat
                  </label>
                  <select
                    id="chat_font_size"
                    disabled={isSaving}
                    value={chatFontSize}
                    onChange={(e) => setChatFontSize(e.target.value as LayoutSize)}
                    className="mt-1 w-full rounded-lg border border-nude-200 px-3 py-2 text-slate-800 focus:border-nude-500 focus:outline-none focus:ring-1 focus:ring-nude-500 disabled:opacity-60"
                  >
                    {LAYOUT_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {LAYOUT_SIZE_LABELS[size]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-nude-200 pt-4">
              <h2 className="text-sm font-semibold text-slate-700">Logomarca</h2>
              <p className="mt-1 text-xs text-slate-400">
                Aparece automaticamente no topo da pré-visualização e do PDF dos seus documentos.
              </p>

              <div className="mt-3 flex items-center gap-4">
                {user?.logo_url ? (
                  <img
                    src={user.logo_url}
                    alt="Logomarca atual"
                    className="h-16 w-auto max-w-[160px] rounded border border-nude-200 object-contain p-1"
                  />
                ) : (
                  <div className="flex h-16 w-32 items-center justify-center rounded border border-dashed border-nude-300 text-xs text-slate-400">
                    Sem logomarca
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="logo"
                    className="cursor-pointer rounded-lg border border-nude-200 px-4 py-2 text-center text-sm font-medium text-slate-600 hover:bg-nude-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
                    aria-disabled={isLogoSaving}
                  >
                    {user?.logo_url ? 'Trocar logomarca' : 'Enviar logomarca'}
                  </label>
                  <input
                    id="logo"
                    type="file"
                    accept={ACCEPTED_LOGO_TYPES.join(',')}
                    disabled={isLogoSaving}
                    onChange={handleLogoChange}
                    className="sr-only"
                  />
                  {user?.logo_url && (
                    <button
                      type="button"
                      disabled={isLogoSaving}
                      onClick={handleRemoveLogo}
                      className="rounded-lg border border-nude-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-nude-100 disabled:opacity-60"
                    >
                      Remover logomarca
                    </button>
                  )}
                </div>
              </div>
              {logoError && <p className="mt-2 text-sm text-red-700">{logoError}</p>}
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700">E-mail</span>
              <p className="mt-1 text-slate-500">{user?.email}</p>
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}
            {confirmation && <p className="text-sm text-nude-700">{confirmation}</p>}

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-nude-600 px-4 py-2 text-sm font-medium text-white hover:bg-nude-700 disabled:opacity-60"
            >
              {isSaving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
