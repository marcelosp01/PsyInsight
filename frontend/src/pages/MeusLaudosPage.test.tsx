import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MeusLaudosPage } from './MeusLaudosPage'
import { api } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      documentTypes: vi.fn(),
      savedDocuments: {
        list: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
      },
    },
  }
})

const documentTypes = [
  { slug: 'declaracao', name: 'Declaração', article: 'Art. 9º', description: '', fields: [] },
]

const savedDocuments = [
  { id: 1, title: 'Laudo João', document_type: 'declaracao', updated_at: '2026-08-01T10:00:00Z' },
  { id: 2, title: 'Laudo Maria', document_type: 'declaracao', updated_at: '2026-08-02T10:00:00Z' },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <MeusLaudosPage />
    </MemoryRouter>,
  )
}

describe('MeusLaudosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.documentTypes).mockResolvedValue(documentTypes)
    vi.mocked(api.savedDocuments.list).mockResolvedValue(savedDocuments)
  })

  it('lists the saved documents with their type name', async () => {
    renderPage()

    expect(await screen.findByText('Laudo João')).toBeInTheDocument()
    expect(screen.getByText('Laudo Maria')).toBeInTheDocument()
    expect(screen.getAllByText(/Declaração/)).toHaveLength(2)
  })

  it('shows an empty state when there are no saved documents', async () => {
    vi.mocked(api.savedDocuments.list).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText(/ainda não salvou nenhum laudo/)).toBeInTheDocument()
  })

  it('renames a saved document', async () => {
    vi.mocked(api.savedDocuments.update).mockResolvedValue({
      ...savedDocuments[0],
      title: 'Laudo João - revisado',
      values: {},
      created_at: '2026-08-01T10:00:00Z',
    })
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Laudo João')
    await user.click(screen.getAllByRole('button', { name: 'Renomear' })[0])

    const input = screen.getByDisplayValue('Laudo João')
    await user.clear(input)
    await user.type(input, 'Laudo João - revisado')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(api.savedDocuments.update).toHaveBeenCalledWith(1, { title: 'Laudo João - revisado' })
    expect(await screen.findByText('Laudo João - revisado')).toBeInTheDocument()
  })

  it('deletes a saved document after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(api.savedDocuments.remove).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Laudo João')
    await user.click(screen.getAllByRole('button', { name: 'Excluir' })[0])

    expect(api.savedDocuments.remove).toHaveBeenCalledWith(1)
    expect(await screen.findByText('Laudo Maria')).toBeInTheDocument()
    expect(screen.queryByText('Laudo João')).not.toBeInTheDocument()
  })

  it('does not delete when the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Laudo João')
    await user.click(screen.getAllByRole('button', { name: 'Excluir' })[0])

    expect(api.savedDocuments.remove).not.toHaveBeenCalled()
    expect(screen.getByText('Laudo João')).toBeInTheDocument()
  })
})
