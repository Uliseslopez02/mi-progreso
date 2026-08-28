export interface NavTab {
  path: string
  label: string
}

export const NAV_TABS: NavTab[] = [
  { label: 'Hoy', path: '/' },
  { label: 'Agenda', path: '/agenda' },
  { label: 'Proyectos', path: '/proyectos' },
  { label: 'Objetivos', path: '/objetivos' },
  { label: 'Historial', path: '/historial' },
  { label: 'Informes', path: '/informes' },
  { label: 'Ajustes', path: '/ajustes' },
]

/**
 * Aplica `order` (paths en el orden elegido) sobre `tabs`. Pestañas no listadas en
 * `order` (nuevas, o `navOrder` desactualizado) quedan al final en su orden por
 * defecto; paths de `order` que ya no existen en `tabs` se ignoran.
 */
export function orderTabs(tabs: NavTab[], order: string[] | undefined): NavTab[] {
  if (!order || order.length === 0) return tabs
  const byPath = new Map(tabs.map((t) => [t.path, t]))
  const ordered = order.map((path) => byPath.get(path)).filter((t): t is NavTab => t !== undefined)
  const seen = new Set(ordered.map((t) => t.path))
  return [...ordered, ...tabs.filter((t) => !seen.has(t.path))]
}
