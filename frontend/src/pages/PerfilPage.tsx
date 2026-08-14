import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'
import { LAYOUT_SIZES, LAYOUT_SIZE_LABELS, normalizeLayoutSize, type LayoutSize } from '../lib/layoutPreferences'

export function PerfilPage() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [crp, setCrp] = useState(user?.crp ?? '')
  const [localAtendimento, setLocalAtendimento] = useState(user?.local_atendimento ?? '')
  const [chatInputSize, setChatInputSize] = useState<LayoutSize>(normalizeLayoutSize(user?.chat_input_size))
  const [chatFontSize, setChatFontSize] = useState<LayoutSize>(normalizeLayoutSize(user?.chat_font_size))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)

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
