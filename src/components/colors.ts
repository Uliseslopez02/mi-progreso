import type { ProgressBand } from '../domain/scoring'

/** Cada banda de progreso tiene su color; se usan en el anillo y el calendario. */
export const BAND_COLOR: Record<ProgressBand, string> = {
  top: 'var(--band-top)',
  high: 'var(--band-high)',
  good: 'var(--band-good)',
  mid: 'var(--band-mid)',
  low: 'var(--band-low)',
  none: 'var(--band-none)',
}

export const BAND_LEGEND: Array<{ band: ProgressBand; label: string }> = [
  { band: 'top', label: '90 – 100%' },
  { band: 'high', label: '75 – 89%' },
  { band: 'good', label: '50 – 74%' },
  { band: 'mid', label: '25 – 49%' },
  { band: 'low', label: '0 – 24%' },
  { band: 'none', label: 'Sin registro' },
]
