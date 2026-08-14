import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { AuthProvider } from '../context/AuthContext'
import { api, ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      me: vi.fn(),
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      documentTypes: vi.fn(),
      generatePdf: vi.fn(),
    },
  }
})

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(api.me).mockRejectedValue(new ApiError('Não autenticado.', 401))
  })

  it('logs in with the entered credentials', async () => {
    vi.mocked(api.login).mockResolvedValue({
      id: 1,
      name: 'Ana Souza',
      email: 'ana@example.com',
      crp: '06/12345',
      local_atendimento: '',
      chat_input_size: 'medio',
      chat_font_size: 'medio',
      logo_url: null,
      created_at: new Date().toISOString(),
    })
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-forte-123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(api.login).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'senha-forte-123',
    })
  })

  it('shows an error message when login fails', async () => {
    vi.mocked(api.login).mockRejectedValue(new ApiError('E-mail ou senha inválidos.', 401))
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument()
  })
})
