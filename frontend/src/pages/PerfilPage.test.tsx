import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
      uploadLogo: vi.fn(),
      removeLogo: vi.fn(),
    },
  }
})

const loggedInUser = {
  id: 1,
  name: 'Ana Souza',
  email: 'ana@example.com',
  crp: '06/12345',
  local_atendimento: 'São Paulo - SP',
  chat_input_size: 'medio',
  chat_font_size: 'medio',
  logo_url: null as string | null,
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
      chat_input_size: 'medio',
      chat_font_size: 'medio',
    })
    expect(await screen.findByText('Perfil atualizado.')).toBeInTheDocument()
  })

  it('submits the chosen chat layout preferences', async () => {
    vi.mocked(api.updateProfile).mockResolvedValue({
      ...loggedInUser,
      chat_input_size: 'grande',
      chat_font_size: 'pequeno',
    })
    const user = userEvent.setup()
    renderPerfilPage()

    await screen.findByDisplayValue('Ana Souza')
    await user.selectOptions(screen.getByLabelText('Tamanho da caixa de mensagem'), 'grande')
    await user.selectOptions(screen.getByLabelText('Tamanho da fonte do chat'), 'pequeno')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(api.updateProfile).toHaveBeenCalledWith({
      name: 'Ana Souza',
      crp: '06/12345',
      local_atendimento: 'São Paulo - SP',
      chat_input_size: 'grande',
      chat_font_size: 'pequeno',
    })
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

  describe('logomarca', () => {
    it('uploads a logo and displays it', async () => {
      vi.mocked(api.uploadLogo).mockResolvedValue({
        ...loggedInUser,
        logo_url: '/api/auth/me/logo?v=1',
      })
      const user = userEvent.setup()
      renderPerfilPage()

      await screen.findByDisplayValue('Ana Souza')
      const file = new File(['fake-bytes'], 'logo.png', { type: 'image/png' })
      await user.upload(screen.getByLabelText('Enviar logomarca'), file)

      expect(api.uploadLogo).toHaveBeenCalledWith(file)
      expect(await screen.findByAltText('Logomarca atual')).toHaveAttribute(
        'src',
        '/api/auth/me/logo?v=1',
      )
    })

    it('rejects an oversized file without calling the API', async () => {
      const user = userEvent.setup()
      renderPerfilPage()

      await screen.findByDisplayValue('Ana Souza')
      const oversized = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'logo.png', {
        type: 'image/png',
      })
      await user.upload(screen.getByLabelText('Enviar logomarca'), oversized)

      expect(await screen.findByText('A imagem excede o tamanho máximo de 2MB.')).toBeInTheDocument()
      expect(api.uploadLogo).not.toHaveBeenCalled()
    })

    it('rejects an unsupported file type without calling the API', async () => {
      renderPerfilPage()

      await screen.findByDisplayValue('Ana Souza')
      const file = new File(['fake-bytes'], 'logo.bmp', { type: 'image/bmp' })
      // `userEvent.upload` respeita o atributo `accept` do input e ignoraria
      // esse arquivo silenciosamente; `fireEvent` testa a validação própria
      // do componente, que é a defesa real (o `accept` é só uma sugestão de UI).
      fireEvent.change(screen.getByLabelText('Enviar logomarca'), { target: { files: [file] } })

      expect(
        await screen.findByText('Formato de imagem não suportado. Use PNG, JPG ou WEBP.'),
      ).toBeInTheDocument()
      expect(api.uploadLogo).not.toHaveBeenCalled()
    })

    it('removes an existing logo', async () => {
      vi.mocked(api.me).mockResolvedValue({ ...loggedInUser, logo_url: '/api/auth/me/logo?v=1' })
      vi.mocked(api.removeLogo).mockResolvedValue({ ...loggedInUser, logo_url: null })
      const user = userEvent.setup()
      renderPerfilPage()

      await screen.findByAltText('Logomarca atual')
      await user.click(screen.getByRole('button', { name: 'Remover logomarca' }))

      expect(api.removeLogo).toHaveBeenCalled()
      await waitFor(() => expect(screen.queryByAltText('Logomarca atual')).not.toBeInTheDocument())
      expect(screen.getByText('Sem logomarca')).toBeInTheDocument()
    })
  })
})
