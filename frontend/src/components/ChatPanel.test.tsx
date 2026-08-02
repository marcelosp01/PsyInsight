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
        selectModality: vi.fn(),
        sendMessage: vi.fn(),
      },
    },
  }
})

const declaracao: DocumentType = {
  slug: 'declaracao',
  name: 'Declaração',
  article: 'Art. 9º',
  description: 'Confirma a ocorrência de um atendimento psicológico.',
  fields: [
    { key: 'texto_declaracao', label: 'Texto da declaração', kind: 'prose', required: true, help_text: null },
  ],
}

const parecer: DocumentType = {
  slug: 'parecer',
  name: 'Parecer Psicológico',
  article: 'Art. 14',
  description: 'Resposta técnica a uma consulta específica.',
  fields: [{ key: 'consulta', label: 'Consulta', kind: 'textarea', required: true, help_text: null }],
}

const documentTypes = [declaracao, parecer]

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
  const onDocumentTypeChange = vi.fn()
  render(
    <ChatPanel
      documentTypes={documentTypes}
      initialDocumentType={declaracao}
      savedDocumentId={null}
      onDocumentTypeChange={onDocumentTypeChange}
      onValuesUpdate={onValuesUpdate}
      {...props}
    />,
  )
  return { onValuesUpdate, onDocumentTypeChange }
}

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('with a known modality (initialDocumentType set)', () => {
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
          { type: 'values', values: { texto_declaracao: 'João da Silva' } },
          { type: 'done' },
        ]),
      )

      const { onValuesUpdate } = renderPanel()

      await waitFor(() =>
        expect(onValuesUpdate).toHaveBeenCalledWith({ texto_declaracao: 'João da Silva' }),
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

  describe('without a known modality (initialDocumentType null)', () => {
    it('opens with a modality-selection turn instead of creating a session', async () => {
      vi.mocked(api.chat.selectModality).mockResolvedValue(
        makeSSEResponse([
          { type: 'token', text: 'Olá! ' },
          { type: 'token', text: 'Qual documento você precisa elaborar hoje?' },
          { type: 'done' },
        ]),
      )

      renderPanel({ initialDocumentType: null })

      expect(await screen.findByText('Olá! Qual documento você precisa elaborar hoje?')).toBeInTheDocument()
      expect(api.chat.selectModality).toHaveBeenCalledWith([], null)
      expect(api.chat.createOrResumeSession).not.toHaveBeenCalled()
    })

    it('resolves the modality from the conversation and starts the real interview', async () => {
      vi.mocked(api.chat.selectModality).mockResolvedValueOnce(
        makeSSEResponse([{ type: 'token', text: 'Olá! O que você precisa produzir?' }, { type: 'done' }]),
      )
      vi.mocked(api.chat.selectModality).mockResolvedValueOnce(
        makeSSEResponse([
          { type: 'token', text: 'Perfeito, vamos elaborar uma declaração.' },
          { type: 'document_type', slug: 'declaracao' },
          { type: 'done' },
        ]),
      )
      vi.mocked(api.chat.createOrResumeSession).mockResolvedValue(chatSession({ messages: [] }))
      vi.mocked(api.chat.sendMessage).mockResolvedValue(
        makeSSEResponse([{ type: 'token', text: 'Qual o nome do paciente?' }, { type: 'done' }]),
      )

      const user = userEvent.setup()
      const { onDocumentTypeChange } = renderPanel({ initialDocumentType: null })
      await screen.findByText('Olá! O que você precisa produzir?')
      await user.type(screen.getByLabelText('Mensagem'), 'Preciso de uma declaração de comparecimento')
      await user.click(screen.getByRole('button', { name: 'Enviar' }))

      expect(await screen.findByText('Perfeito, vamos elaborar uma declaração.')).toBeInTheDocument()
      await waitFor(() => expect(onDocumentTypeChange).toHaveBeenCalledWith(declaracao))
      expect(api.chat.createOrResumeSession).toHaveBeenCalledWith({
        document_type: 'declaracao',
        saved_document_id: null,
      })
      expect(await screen.findByText('Qual o nome do paciente?')).toBeInTheDocument()
    })

    it('stays in selection mode when the reply does not resolve a modality', async () => {
      vi.mocked(api.chat.selectModality).mockResolvedValueOnce(
        makeSSEResponse([{ type: 'token', text: 'O que você precisa produzir?' }, { type: 'done' }]),
      )
      renderPanel({ initialDocumentType: null })
      await screen.findByText('O que você precisa produzir?')

      vi.mocked(api.chat.selectModality).mockResolvedValueOnce(
        makeSSEResponse([{ type: 'token', text: 'Pode me contar um pouco mais sobre a situação?' }, { type: 'done' }]),
      )
      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Mensagem'), 'Não sei bem o que preciso')
      await user.click(screen.getByRole('button', { name: 'Enviar' }))

      expect(await screen.findByText('Pode me contar um pouco mais sobre a situação?')).toBeInTheDocument()
      expect(api.chat.createOrResumeSession).not.toHaveBeenCalled()
    })
  })
})
