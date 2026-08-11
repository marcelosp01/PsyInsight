import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'

export function PerfilPage() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [crp, setCrp] = useState(user?.crp ?? '')
  const [localAtendimento, setLocalAtendimento] = useState(user?.local_atendimento ?? '')
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
  }, [user])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      await updateProfile({ name, crp, local_atendimento: localAtendimento })
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
