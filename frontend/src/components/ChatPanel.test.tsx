import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatPanel } from './ChatPanel'
import { api, ApiError } from '../api/client'
import { makeSSEResponse } from '../test/sse'
import type { ChatSession, DocumentType } from '../types/document'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      chat: {
        createOrResumeSession: vi.fn(),
        sendMessage: vi.fn(),
      },
    },
  }
})

const documentType: DocumentType = {
  slug: 'declaracao',
  name: 'Declaração',
  article: 'Art. 9º',
  description: 'Confirma a ocorrência de um atendimento psicológico.',
  fields: [
    { key: 'identificacao', label: 'Identificação', kind: 'textarea', required: true, help_text: null },
  ],
}

function chatSession(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: 1,
    document_type: 'declaracao',
    saved_document_id: null,
    values: {},
    messages: [],
    ...overrides,
  }
}

function renderPanel(props: Partial<Parameters<typeof ChatPanel>[0]> = {}) {
  const onValuesUpdate = vi.fn()
  render(
    <ChatPanel
      documentType={documentType}
      savedDocumentId={null}
      onValuesUpdate={onValuesUpdate}
      {...props}
    />,
  )
  return { onValuesUpdate }
}

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a session and renders its existing messages', async () => {
    vi.mocked(api.chat.createOrResumeSession).mockResolvedValue(
      chatSession({
        messages: [{ id: 1, role: 'assistant', content: 'Olá! Vamos começar?', created_at: '2026-01-01' }],
      }),
    )

    renderPanel()

    expect(await screen.findByText('Olá! Vamos começar?')).toBeInTheDocument()
    expect(api.chat.createOrResumeSession).toHaveBeenCalledWith({
      document_type: 'declaracao',
      saved_document_id: null,
    })
  })

  it('automatically sends a kickoff message when the session has no history', async () => {
    vi.mocked(api.chat.createOrResumeSession).mockResolvedValue(chatSession({ messages: [] }))
    vi.mocked(api.chat.sendMessage).mockResolvedValue(
      makeSSEResponse([
        { type: 'token', text: 'Olá! ' },
        { type: 'token', text: 'Qual o nome do paciente?' },
        { type: 'done' },
      ]),
    )

    renderPanel()

    expect(await screen.findByText('Olá! Qual o nome do paciente?')).toBeInTheDocument()
    expect(api.chat.sendMessage).toHaveBeenCalledWith(1, null)
  })

  it('sends a typed message and streams the assistant reply', async () => {
    vi.mocked(api.chat.createOrResumeSession).mockResolvedValue(
      chatSession({
        messages: [{ id: 1, role: 'assistant', content: 'Qual o nome do paciente?', created_at: '2026-01-01' }],
      }),
    )
    vi.mocked(api.chat.sendMessage).mockResolvedValue(
      makeSSEResponse([{ type: 'token', text: 'Entendido.' }, { type: 'done' }]),
    )
    const user = userEvent.setup()
    renderPanel()

    await screen.findByText('Qual o nome do paciente?')
    await user.type(screen.getByLabelText('Mensagem'), 'João da Silva')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('João da Silva')).toBeInTheDocument()
    expect(await screen.findByText('Entendido.')).toBeInTheDocument()
    expect(api.chat.sendMessage).toHaveBeenCalledWith(1, 'João da Silva')
  })

  it('calls onValuesUpdate when a values event arrives', async () => {
    vi.mocked(api.chat.createOrResumeSession).mockResolvedValue(chatSession({ messages: [] }))
    vi.mocked(api.chat.sendMessage).mockResolvedValue(
      makeSSEResponse([
        { type: 'values', values: { identificacao: 'João da Silva' } },
        { type: 'done' },
      ]),
    )

    const { onValuesUpdate } = renderPanel()

    await waitFor(() =>
      expect(onValuesUpdate).toHaveBeenCalledWith({ identificacao: 'João da Silva' }),
    )
  })

  it('shows an error message when the stream reports an error', async () => {
    vi.mocked(api.chat.createOrResumeSession).mockResolvedValue(chatSession({ messages: [] }))
    vi.mocked(api.chat.sendMessage).mockResolvedValue(
      makeSSEResponse([{ type: 'error', detail: 'Não foi possível obter resposta da IA.' }]),
    )

    renderPanel()

    expect(await screen.findByText('Não foi possível obter resposta da IA.')).toBeInTheDocument()
  })

  it('shows an error message when the session fails to start', async () => {
    vi.mocked(api.chat.createOrResumeSession).mockRejectedValue(
      new ApiError('Modalidade de documento desconhecida.', 404),
    )

    renderPanel()

    expect(await screen.findByText('Modalidade de documento desconhecida.')).toBeInTheDocument()
  })

  it('disables the input while a message is streaming', async () => {
    vi.mocked(api.chat.createOrResumeSession).mockResolvedValue(
      chatSession({
        messages: [{ id: 1, role: 'assistant', content: 'Oi', created_at: '2026-01-01' }],
      }),
    )
    let resolveSend!: (value: Response) => void
    vi.mocked(api.chat.sendMessage).mockReturnValue(
      new Promise((resolve) => {
        resolveSend = resolve
      }),
    )
    const user = userEvent.setup()
    renderPanel()

    await screen.findByText('Oi')
    await user.type(screen.getByLabelText('Mensagem'), 'Olá')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(screen.getByLabelText('Mensagem')).toBeDisabled()

    resolveSend(makeSSEResponse([{ type: 'done' }]))
    await waitFor(() => expect(screen.getByLabelText('Mensagem')).not.toBeDisabled())
  })
})
