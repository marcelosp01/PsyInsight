export type LayoutSize = 'pequeno' | 'medio' | 'grande'

export const LAYOUT_SIZES: LayoutSize[] = ['pequeno', 'medio', 'grande']

export const LAYOUT_SIZE_LABELS: Record<LayoutSize, string> = {
  pequeno: 'Pequeno',
  medio: 'Médio',
  grande: 'Grande',
}

// `medio` corresponde ao valor fixo usado antes desta preferência existir
// (`text-sm` / `h-24`), para não mudar a aparência de quem nunca configurou nada.
export const CHAT_INPUT_HEIGHT_CLASSES: Record<LayoutSize, string> = {
  pequeno: 'h-16',
  medio: 'h-24',
  grande: 'h-36',
}

export const CHAT_FONT_SIZE_CLASSES: Record<LayoutSize, string> = {
  pequeno: 'text-xs',
  medio: 'text-sm',
  grande: 'text-base',
}

export function normalizeLayoutSize(value: string | null | undefined): LayoutSize {
  return value === 'pequeno' || value === 'medio' || value === 'grande' ? value : 'medio'
}
