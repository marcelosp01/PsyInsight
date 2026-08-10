import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PerfilPage } from './PerfilPage'
import { AuthProvider } from '../context/AuthContext'
import { api, ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      me: vi.fn(),
      updateProfile: vi.fn(),
    },
  }
})

const loggedInUser = {
  id: 1,
  name: 'Ana Souza',
  email: 'ana@example.com',
  crp: '06/12345',
  local_atendimento: 'São Paulo - SP',
  created_at: new Date().toISOString(),
}

function renderPerfilPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <PerfilPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('PerfilPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.me).mockResolvedValue(loggedInUser)
  })

  it('pre-fills the form with the logged-in user data', async () => {
    renderPerfilPage()

    expect(await screen.findByDisplayValue('Ana Souza')).toBeInTheDocument()
    expect(screen.getByDisplayValue('06/12345')).toBeInTheDocument()
    expect(screen.getByDisplayValue('São Paulo - SP')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  })

  it('submits the updated profile and shows a confirmation', async () => {
    vi.mocked(api.updateProfile).mockResolvedValue({
      ...loggedInUser,
      local_atendimento: 'Recife - PE',
    })
    const user = userEvent.setup()
    renderPerfilPage()

    await screen.findByDisplayValue('Ana Souza')
    const localInput = screen.getByLabelText('Local de atendimento')
    await user.clear(localInput)
    await user.type(localInput, 'Recife - PE')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(api.updateProfile).toHaveBeenCalledWith({
      name: 'Ana Souza',
      crp: '06/12345',
      local_atendimento: 'Recife - PE',
    })
    expect(await screen.findByText('Perfil atualizado.')).toBeInTheDocument()
  })

  it('shows an error message when updating the profile fails', async () => {
    vi.mocked(api.updateProfile).mockRejectedValue(new ApiError('Não foi possível salvar.', 500))
    const user = userEvent.setup()
    renderPerfilPage()

    await screen.findByDisplayValue('Ana Souza')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Não foi possível salvar.')).toBeInTheDocument()
  })

  it('disables the fields while saving, so in-flight edits cannot be lost when the response resyncs the form', async () => {
    let resolveUpdate!: (value: typeof loggedInUser) => void
    vi.mocked(api.updateProfile).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve
      }),
    )
    const user = userEvent.setup()
    renderPerfilPage()

    await screen.findByDisplayValue('Ana Souza')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(screen.getByLabelText('Nome completo')).toBeDisabled()
    expect(screen.getByLabelText('CRP')).toBeDisabled()
    expect(screen.getByLabelText('Local de atendimento')).toBeDisabled()

    resolveUpdate(loggedInUser)
    await waitFor(() => expect(screen.getByLabelText('Nome completo')).not.toBeDisabled())
  })
})
