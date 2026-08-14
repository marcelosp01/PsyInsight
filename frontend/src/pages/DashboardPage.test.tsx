import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { AuthProvider } from '../context/AuthContext'
import { api, ApiError } from '../api/client'
import { makeSSEResponse } from '../test/sse'
import type { ChatSession, DocumentType, SavedDocument } from '../types/document'

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
      savedDocuments: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
      },
      chat: {
        createOrResumeSession: vi.fn(),
        selectModality: vi.fn(),
        sendMessage: vi.fn(),
      },
    },
  }
})

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const documentTypes: DocumentType[] = [
  {
    slug: 'declaracao',
    name: 'Declaração',
    article: 'Art. 9º',
    description: 'Confirma a ocorrência de um atendimento psicológico.',
    fields: [
      { key: 'texto_declaracao', label: 'Texto da declaração', kind: 'prose', required: true, help_text: null, auto_filled: false },
      { key: 'profissional_nome', label: 'Nome do(a) psicólogo(a)', kind: 'text', required: true, help_text: null, auto_filled: true },
      { key: 'profissional_crp', label: 'CRP', kind: 'text', required: true, help_text: null, auto_filled: true },
      { key: 'cidade_data', label: 'Local e data', kind: 'text', required: true, help_text: null, auto_filled: true },
    ],
  },
  {
    slug: 'parecer',
    name: 'Parecer Psicológico',
    article: 'Art. 14',
    description: 'Resposta técnica a uma consulta específica.',
    fields: [
      { key: 'texto_parecer', label: 'Texto do parecer', kind: 'prose', required: true, help_text: null, auto_filled: false },
      { key: 'profissional_nome', label: 'Nome do(a) psicólogo(a)', kind: 'text', required: true, help_text: null, auto_filled: true },
    ],
  },
]

const loggedInUser = {
  id: 1,
  name: 'Ana Souza',
  email: 'ana@example.com',
  crp: '06/12345',
  local_atendimento: '',
  chat_input_size: 'medio',
  chat_font_size: 'medio',
  logo_url: null,
  created_at: new Date().toISOString(),
}

function savedDocument(overrides: Partial<SavedDocument> = {}): SavedDocument {
  return {
    id: 42,
    title: 'Meu laudo',
    document_type: 'declaracao',
    values: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function chatSession(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: 1,
    document_type: 'declaracao',
    saved_document_id: null,
    values: {},
    messages: [{ id: 1, role: 'assistant', content: 'Olá! Vamos começar?', created_at: new Date().toISOString() }],
    ...overrides,
  }
}

function renderDashboard(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.me).mockResolvedValue(loggedInUser)
    vi.mocked(api.documentTypes).mockResolvedValue(documentTypes)
    // Por padrão, a própria mensagem de abertura (sem conteúdo do usuário) já
    // resolve para "declaração", simulando o caso comum em que o chat entende
    // de imediato o que foi pedido, sem precisar de nenhuma resposta.
    vi.mocked(api.chat.selectModality).mockResolvedValue(
      makeSSEResponse([{ type: 'document_type', slug: 'declaracao' }, { type: 'done' }]),
    )
    vi.mocked(api.chat.createOrResumeSession).mockResolvedValue(chatSession())
    vi.mocked(api.chat.sendMessage).mockResolvedValue(makeSSEResponse([{ type: 'done' }]))
  })

  it('links to the profile page', async () => {
    renderDashboard()

    expect(await screen.findByRole('link', { name: 'Meu Perfil' })).toHaveAttribute(
      'href',
      '/perfil',
    )
  })

  it('starts without a preview until the chat resolves the document modality', async () => {
    const deferred = createDeferred<Response>()
    vi.mocked(api.chat.selectModality).mockReturnValue(deferred.promise)
    renderDashboard()

    await screen.findByText('Entrevista')
    expect(
      screen.getByText(/A pré-visualização aparece assim que a modalidade/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()

    deferred.resolve(makeSSEResponse([{ type: 'document_type', slug: 'declaracao' }, { type: 'done' }]))

    await waitFor(() => expect(api.chat.createOrResumeSession).toHaveBeenCalled())
    expect(await screen.findByText('Declaração')).toBeInTheDocument()
  })

  it('keeps editing the same record after creating a saved document (id is persisted in the URL)', async () => {
    const created = savedDocument()
    vi.mocked(api.savedDocuments.create).mockResolvedValue(created)
    vi.mocked(api.savedDocuments.get).mockResolvedValue(created)
    vi.mocked(api.chat.createOrResumeSession).mockResolvedValue(chatSession({ messages: [] }))
    vi.mocked(api.chat.sendMessage).mockResolvedValue(
      makeSSEResponse([
        {
          type: 'values',
          values: {
            profissional_nome: 'Ana Souza',
            profissional_crp: '06/12345',
            cidade_data: 'São Paulo, hoje',
            texto_declaracao: 'João compareceu a 4 sessões de atendimento psicológico.',
          },
        },
        { type: 'done' },
      ]),
    )
    const user = userEvent.setup()
    renderDashboard()

    await screen.findByText('Entrevista')
    // A modalidade é resolvida pelo chat e a sessão real (sem histórico) dispara
    // automaticamente a primeira mensagem.
    await waitFor(() => expect(screen.getByLabelText('Mensagem')).not.toBeDisabled())

    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await user.type(screen.getByLabelText('Título'), 'Meu laudo')
    await user.click(screen.getAllByRole('button', { name: 'Salvar' }).at(-1)!)

    await screen.findByText(/salvo em Meus Laudos/)

    // The saved id must have been written back to the URL: that's what drives the
    // reload effect below, proving a refresh would keep editing record #42 instead
    // of creating a duplicate on the next save.
    await waitFor(() => expect(api.savedDocuments.get).toHaveBeenCalledWith(42))
  })

  it('ignores a stale saved-document fetch if the user starts a new document before it resolves', async () => {
    const deferred = createDeferred<SavedDocument>()
    vi.mocked(api.savedDocuments.get).mockReturnValue(deferred.promise)
    // Never resolves: keeps the panel in "selecting modality" so we can assert the
    // placeholder preview stays even after the stale saved-document fetch lands.
    vi.mocked(api.chat.selectModality).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderDashboard(['/?laudoId=1'])

    await screen.findByText('Entrevista')
    await user.click(screen.getByRole('button', { name: 'Novo laudo' }))

    // The stale fetch for the old saved document resolves late.
    deferred.resolve(savedDocument({ id: 1, document_type: 'declaracao' }))

    await waitFor(() => {
      expect(
        screen.getByText(/A pré-visualização aparece assim que a modalidade/),
      ).toBeInTheDocument()
    })
    expect(screen.queryByText(/Editando laudo salvo/)).not.toBeInTheDocument()
  })

  it('shows an error message when a requested saved document fails to load', async () => {
    vi.mocked(api.savedDocuments.get).mockRejectedValue(
      new ApiError('Laudo salvo não encontrado.', 404),
    )
    renderDashboard(['/?laudoId=999'])

    expect(await screen.findByText('Laudo salvo não encontrado.')).toBeInTheDocument()
  })
})
