import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { AuthProvider } from '../context/AuthContext'
import { api, ApiError } from '../api/client'
import type { DocumentType, SavedDocument } from '../types/document'

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
      { key: 'profissional_nome', label: 'Nome do(a) psicólogo(a)', kind: 'text', required: true, help_text: null },
      { key: 'profissional_crp', label: 'CRP', kind: 'text', required: true, help_text: null },
      { key: 'cidade_data', label: 'Cidade e data', kind: 'text', required: true, help_text: null },
      { key: 'identificacao', label: 'Identificação', kind: 'textarea', required: true, help_text: null },
      { key: 'teor_declaracao', label: 'Teor da declaração', kind: 'textarea', required: true, help_text: null },
    ],
  },
  {
    slug: 'parecer',
    name: 'Parecer Psicológico',
    article: 'Art. 14',
    description: 'Resposta técnica a uma consulta específica.',
    fields: [
      { key: 'profissional_nome', label: 'Nome do(a) psicólogo(a)', kind: 'text', required: true, help_text: null },
      { key: 'consulta', label: 'Consulta / quesito formulado', kind: 'textarea', required: true, help_text: null },
    ],
  },
]

const loggedInUser = {
  id: 1,
  name: 'Ana Souza',
  email: 'ana@example.com',
  crp: '06/12345',
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
  })

  it('keeps editing the same record after creating a saved document (id is persisted in the URL)', async () => {
    const created = savedDocument()
    vi.mocked(api.savedDocuments.create).mockResolvedValue(created)
    vi.mocked(api.savedDocuments.get).mockResolvedValue(created)
    const user = userEvent.setup()
    renderDashboard()

    await screen.findByText('Dados do documento')
    await user.type(screen.getByLabelText(/Cidade e data/), 'São Paulo, hoje')
    await user.type(screen.getByLabelText(/Identificação/), 'João')
    await user.type(screen.getByLabelText(/Teor da declaração/), 'Compareceu')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await user.type(screen.getByLabelText('Título'), 'Meu laudo')
    await user.click(screen.getAllByRole('button', { name: 'Salvar' }).at(-1)!)

    await screen.findByText(/salvo em Meus Laudos/)

    // The saved id must have been written back to the URL: that's what drives the
    // reload effect below, proving a refresh would keep editing record #42 instead
    // of creating a duplicate on the next save.
    await waitFor(() => expect(api.savedDocuments.get).toHaveBeenCalledWith(42))
  })

  it('ignores a stale saved-document fetch if the user switches modality before it resolves', async () => {
    const deferred = createDeferred<SavedDocument>()
    vi.mocked(api.savedDocuments.get).mockReturnValue(deferred.promise)
    const user = userEvent.setup()
    renderDashboard(['/?laudoId=1'])

    await screen.findByText('Dados do documento')
    await user.selectOptions(screen.getByLabelText('Modalidade do documento'), 'parecer')

    // The stale fetch for the old (declaração) saved document resolves late.
    deferred.resolve(savedDocument({ id: 1, document_type: 'declaracao' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Modalidade do documento')).toHaveValue('parecer')
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
