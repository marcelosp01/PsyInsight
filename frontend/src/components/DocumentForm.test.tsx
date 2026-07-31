import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DocumentForm } from './DocumentForm'
import type { DocumentField } from '../types/document'

const fields: DocumentField[] = [
  { key: 'nome', label: 'Nome', kind: 'text', required: true, help_text: null },
  { key: 'observacoes', label: 'Observações', kind: 'textarea', required: false, help_text: 'Opcional' },
]

function renderForm(overrides: Partial<React.ComponentProps<typeof DocumentForm>> = {}) {
  const onChange = vi.fn()
  const onBlur = vi.fn()
  render(
    <DocumentForm
      fields={fields}
      values={{}}
      touchedKeys={new Set()}
      onChange={onChange}
      onBlur={onBlur}
      {...overrides}
    />,
  )
  return { onChange, onBlur }
}

describe('DocumentForm', () => {
  it('renders a labeled input for each field, marking required ones', () => {
    renderForm()

    expect(screen.getByLabelText(/Nome/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Observações/)).toBeInTheDocument()
    expect(screen.getByText('Opcional')).toBeInTheDocument()
  })

  it('calls onChange as the user types', async () => {
    const { onChange } = renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Nome/), 'Ana')

    // The input is controlled by a static `values` prop in this test, so each
    // keystroke is reported against the same unchanged starting value.
    expect(onChange).toHaveBeenCalledWith('nome', 'A')
    expect(onChange).toHaveBeenCalledWith('nome', 'n')
    expect(onChange).toHaveBeenCalledWith('nome', 'a')
  })

  it('calls onBlur with the field key', async () => {
    const { onBlur } = renderForm()
    const user = userEvent.setup()

    await user.click(screen.getByLabelText(/Nome/))
    await user.tab()

    expect(onBlur).toHaveBeenCalledWith('nome')
  })

  it('marks a required empty field as invalid only after it has been touched', () => {
    const { rerender } = render(
      <DocumentForm
        fields={fields}
        values={{}}
        touchedKeys={new Set()}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/Nome/)).toHaveAttribute('aria-invalid', 'false')

    rerender(
      <DocumentForm
        fields={fields}
        values={{}}
        touchedKeys={new Set(['nome'])}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/Nome/)).toHaveAttribute('aria-invalid', 'true')
  })
})
