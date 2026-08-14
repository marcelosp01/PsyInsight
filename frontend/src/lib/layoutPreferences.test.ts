import { describe, expect, it } from 'vitest'
import { normalizeLayoutSize } from './layoutPreferences'

describe('normalizeLayoutSize', () => {
  it('returns the value when it is a known layout size', () => {
    expect(normalizeLayoutSize('pequeno')).toBe('pequeno')
    expect(normalizeLayoutSize('medio')).toBe('medio')
    expect(normalizeLayoutSize('grande')).toBe('grande')
  })

  it('falls back to medio for null, undefined, or unknown values', () => {
    expect(normalizeLayoutSize(null)).toBe('medio')
    expect(normalizeLayoutSize(undefined)).toBe('medio')
    expect(normalizeLayoutSize('enorme')).toBe('medio')
  })
})
