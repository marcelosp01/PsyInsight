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
    { key: 'profissional_nome', label: 'Nome do(a) psicólogo(a)', kind: 'text', required: true, help_text: null, auto_filled: true },
    { key: 'texto_declaracao', label: 'Texto da declaração', kind: 'prose', required: true, help_text: null, auto_filled: false },
  ],
}

describe('DocumentPreview', () => {
  it('shows the document title and CFP article reference', () => {
    render(<DocumentPreview documentType={documentType} values={{}} />)

    expect(screen.getByText('Declaração')).toBeInTheDocument()
    expect(screen.getByText('Art. 9º da Resolução CFP nº 06/2019')).toBeInTheDocument()
  })

  it('renders a placeholder for a regular field that has not been filled in', () => {
    render(<DocumentPreview documentType={documentType} values={{}} />)

    expect(screen.getByText('Não preenchido')).toBeInTheDocument()
  })

  it('renders the filled-in value once a regular field has content', () => {
    render(
      <DocumentPreview
        documentType={documentType}
        values={{ profissional_nome: 'Ana Souza' }}
      />,
    )

    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
  })

  it('renders a prose field as continuous text, without a field label heading', () => {
    render(
      <DocumentPreview
        documentType={documentType}
        values={{ texto_declaracao: 'Declaro, para os devidos fins, que João da Silva...' }}
      />,
    )

    expect(
      screen.getByText('Declaro, para os devidos fins, que João da Silva...'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Texto da declaração')).not.toBeInTheDocument()
  })

  it('shows a conversational placeholder for an empty prose field', () => {
    render(<DocumentPreview documentType={documentType} values={{}} />)

    expect(
      screen.getByText('O texto do documento vai sendo construído aqui à medida que você responde no chat.'),
    ).toBeInTheDocument()
  })
})
