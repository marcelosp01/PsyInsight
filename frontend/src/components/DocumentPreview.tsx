import type { DocumentType } from '../types/document'

interface DocumentPreviewProps {
  documentType: DocumentType
  values: Record<string, string>
}

export function DocumentPreview({ documentType, values }: DocumentPreviewProps) {
  return (
    <div
      id="document-preview"
      className="mx-auto min-h-[29.7cm] w-full max-w-[21cm] rounded-lg border border-nude-200 bg-white p-[2cm] font-preview text-slate-800 shadow-sm"
    >
      <header className="border-b border-nude-200 pb-4 text-center">
        <h2 className="text-xl font-semibold">{documentType.name}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {documentType.article} da Resolução CFP nº 06/2019
        </p>
      </header>

      <div className="mt-6 space-y-5">
        {documentType.fields.map((field) => {
          const value = (values[field.key] ?? '').trim()

          if (field.kind === 'prose') {
            return (
              <p
                key={field.key}
                className={`whitespace-pre-wrap leading-relaxed ${value ? 'text-slate-800' : 'text-slate-300 italic'}`}
              >
                {value || 'O texto do documento vai sendo construído aqui à medida que você responde no chat.'}
              </p>
            )
          }

          return (
            <section key={field.key}>
              <h3 className="text-sm font-semibold tracking-wide text-nude-700 uppercase">
                {field.label}
              </h3>
              <p className={`mt-1 whitespace-pre-wrap ${value ? 'text-slate-800' : 'text-slate-300 italic'}`}>
                {value || 'Não preenchido'}
              </p>
            </section>
          )
        })}
      </div>
    </div>
  )
}
