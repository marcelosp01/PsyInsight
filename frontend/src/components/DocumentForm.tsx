import type { DocumentField } from '../types/document'

interface DocumentFormProps {
  fields: DocumentField[]
  values: Record<string, string>
  touchedKeys: Set<string>
  onChange: (key: string, value: string) => void
  onBlur: (key: string) => void
}

export function DocumentForm({ fields, values, touchedKeys, onChange, onBlur }: DocumentFormProps) {
  return (
    <div className="space-y-5">
      {fields.map((field) => {
        const value = values[field.key] ?? ''
        const isInvalid = field.required && touchedKeys.has(field.key) && value.trim() === ''

        return (
          <div key={field.key}>
            <label htmlFor={field.key} className="block text-sm font-medium text-slate-700">
              {field.label}
              {field.required && <span className="ml-1 text-sage-600">*</span>}
            </label>
            {field.help_text && <p className="mt-0.5 text-xs text-slate-400">{field.help_text}</p>}

            {field.kind === 'textarea' ? (
              <textarea
                id={field.key}
                rows={4}
                value={value}
                onChange={(e) => onChange(field.key, e.target.value)}
                onBlur={() => onBlur(field.key)}
                aria-invalid={isInvalid}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 ${
                  isInvalid
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                    : 'border-sage-200 focus:border-sage-500 focus:ring-sage-500'
                }`}
              />
            ) : (
              <input
                id={field.key}
                type={field.kind === 'date' ? 'date' : 'text'}
                value={value}
                onChange={(e) => onChange(field.key, e.target.value)}
                onBlur={() => onBlur(field.key)}
                aria-invalid={isInvalid}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 ${
                  isInvalid
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                    : 'border-sage-200 focus:border-sage-500 focus:ring-sage-500'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
