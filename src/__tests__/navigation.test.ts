import { describe, expect, it } from 'vitest'
import { orderTabs, type NavTab } from '../domain/navigation'

const tabs: NavTab[] = [
  { path: '/', label: 'Hoy' },
  { path: '/agenda', label: 'Agenda' },
  { path: '/objetivos', label: 'Objetivos' },
]

describe('orderTabs', () => {
  it('sin order devuelve las tabs tal cual', () => {
    expect(orderTabs(tabs, undefined)).toEqual(tabs)
    expect(orderTabs(tabs, [])).toEqual(tabs)
  })

  it('reordena según order', () => {
    const result = orderTabs(tabs, ['/objetivos', '/', '/agenda'])
    expect(result.map((t) => t.path)).toEqual(['/objetivos', '/', '/agenda'])
  })

  it('ignora paths de order que ya no existen en tabs', () => {
    const result = orderTabs(tabs, ['/objetivos', '/borrada', '/'])
    expect(result.map((t) => t.path)).toEqual(['/objetivos', '/', '/agenda'])
  })

  it('agrega al final, en su orden por defecto, las tabs que faltan en order', () => {
    const result = orderTabs(tabs, ['/objetivos'])
    expect(result.map((t) => t.path)).toEqual(['/objetivos', '/', '/agenda'])
  })
})
