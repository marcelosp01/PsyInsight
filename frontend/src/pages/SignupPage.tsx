import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [crp, setCrp] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await signup({ name, email, crp, password })
      navigate('/', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível criar a conta. Tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sage-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-sage-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-800">Criar conta</h1>
        <p className="mt-1 text-sm text-slate-500">Cadastre-se para começar a usar o PsyInsight.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              Nome completo
            </label>
            <input
              id="name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sage-200 px-3 py-2 text-slate-800 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
            />
          </div>

          <div>
            <label htmlFor="crp" className="block text-sm font-medium text-slate-700">
              CRP
            </label>
            <input
              id="crp"
              required
              placeholder="Ex.: 06/12345"
              value={crp}
              onChange={(e) => setCrp(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sage-200 px-3 py-2 text-slate-800 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sage-200 px-3 py-2 text-slate-800 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sage-200 px-3 py-2 text-slate-800 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
            />
            <p className="mt-1 text-xs text-slate-400">Mínimo de 8 caracteres.</p>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-sage-600 px-4 py-2 font-medium text-white transition hover:bg-sage-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-sage-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
