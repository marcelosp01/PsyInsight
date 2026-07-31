import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DocumentPreview } from './DocumentPreview'
import type { DocumentType } from '../types/document'

const documentType: DocumentType = {
  slug: 'declaracao',
  name: 'Declaração',
  article: 'Art. 9º',
  description: 'Confirma um atendimento.',
  fields: [
    { key: 'identificacao', label: 'Identificação', kind: 'textarea', required: true, help_text: null },
    { key: 'teor_declaracao', label: 'Teor da declaração', kind: 'textarea', required: true, help_text: null },
  ],
}

describe('DocumentPreview', () => {
  it('shows the document title and CFP article reference', () => {
    render(<DocumentPreview documentType={documentType} values={{}} />)

    expect(screen.getByText('Declaração')).toBeInTheDocument()
    expect(screen.getByText('Art. 9º da Resolução CFP nº 06/2019')).toBeInTheDocument()
  })

  it('renders a placeholder for fields that have not been filled in', () => {
    render(<DocumentPreview documentType={documentType} values={{}} />)

    const placeholders = screen.getAllByText('Não preenchido')
    expect(placeholders).toHaveLength(2)
  })

  it('renders the filled-in value once the field has content', () => {
    render(
      <DocumentPreview
        documentType={documentType}
        values={{ identificacao: 'João da Silva, 30 anos.' }}
      />,
    )

    expect(screen.getByText('João da Silva, 30 anos.')).toBeInTheDocument()
    expect(screen.getAllByText('Não preenchido')).toHaveLength(1)
  })
})
