/**
 * Paleta curada de colores por categoría. Elegida para no pisar los colores que ya
 * tienen significado propio en la app (`--band-top/high` verde, `--band-good` ámbar,
 * `--band-mid` naranja, `--band-low` rojo — usar esos tonos para una categoría se
 * confundiría con "cumplimiento bueno/malo").
 */
export const CATEGORY_PALETTE = [
  '#38bdf8', // celeste
  '#6366f1', // índigo
  '#a78bfa', // violeta
  '#e879f9', // fucsia
  '#fb7185', // rosa
  '#2dd4bf', // verde azulado
  '#22d3ee', // cian
  '#a3e635', // lima
  '#94a3b8', // gris azulado
] as const

export const CATEGORY_COLOR_NAMES: Record<string, string> = {
  '#38bdf8': 'celeste',
  '#6366f1': 'índigo',
  '#a78bfa': 'violeta',
  '#e879f9': 'fucsia',
  '#fb7185': 'rosa',
  '#2dd4bf': 'verde azulado',
  '#22d3ee': 'cian',
  '#a3e635': 'lima',
  '#94a3b8': 'gris azulado',
}
