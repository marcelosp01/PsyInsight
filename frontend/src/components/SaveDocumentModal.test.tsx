import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SaveDocumentModal } from './SaveDocumentModal'

describe('SaveDocumentModal', () => {
  it('pre-fills the title input with the initial title', () => {
    render(
      <SaveDocumentModal
        initialTitle="Laudo João"
        isSaving={false}
        error={null}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Título')).toHaveValue('Laudo João')
  })

  it('calls onConfirm with the trimmed title on submit', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <SaveDocumentModal
        initialTitle=""
        isSaving={false}
        error={null}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    await user.type(screen.getByLabelText('Título'), '  Laudo revisado  ')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onConfirm).toHaveBeenCalledWith('Laudo revisado')
  })

  it('calls onCancel when the cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(
      <SaveDocumentModal
        initialTitle="Laudo João"
        isSaving={false}
        error={null}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalled()
  })

  it('disables the submit button and shows a loading label while saving', () => {
    render(
      <SaveDocumentModal
        initialTitle="Laudo João"
        isSaving={true}
        error={null}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled()
  })

  it('shows an error message when provided', () => {
    render(
      <SaveDocumentModal
        initialTitle="Laudo João"
        isSaving={false}
        error="Não foi possível salvar o laudo."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText('Não foi possível salvar o laudo.')).toBeInTheDocument()
  })
})
