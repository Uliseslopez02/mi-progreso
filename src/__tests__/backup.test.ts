import { describe, expect, it } from 'vitest'
import { createInitialData } from '../domain/defaults'
import { backupFileName, parseBackup, serializeBackup } from '../storage/backup'

const EXPORTED_AT = '2026-08-18T15:30:00.000Z'

function sampleData() {
  const data = createInitialData('2026-08-01T10:00:00.000Z')
  data.settings.appName = 'Disciplina'
  data.days['2026-08-18'] = {
    date: '2026-08-18',
    goals: [{ goalId: 'dev-leer', name: 'Leer', categoryId: 'desarrollo', categoryName: 'Desarrollo personal', weight: 2, kind: 'boolean' }],
    goalProgress: { 'dev-leer': true },
    closed: false,
  }
  return data
}

describe('respaldo', () => {
  it('exporta e importa sin perder nada', () => {
    const original = sampleData()
    const result = parseBackup(serializeBackup(original, EXPORTED_AT))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.settings.appName).toBe('Disciplina')
    expect(result.data.goals).toHaveLength(11)
    expect(result.data.days['2026-08-18'].goalProgress).toEqual({ 'dev-leer': true })
    expect(result.data.days['2026-08-18'].goals[0].weight).toBe(2)
  })

  it('nombra el archivo con la fecha del respaldo', () => {
    expect(backupFileName(EXPORTED_AT)).toBe('mi-progreso-2026-08-18.json')
  })

  it('acepta también un volcado crudo de los datos', () => {
    const result = parseBackup(JSON.stringify(sampleData()))
    expect(result.ok).toBe(true)
  })

  it('rechaza un archivo que no es JSON', () => {
    const result = parseBackup('esto no es json')
    expect(result).toEqual({ ok: false, error: 'El archivo no es un JSON válido.' })
  })

  it('rechaza un JSON que no es de Mi Progreso', () => {
    const result = parseBackup(JSON.stringify({ hola: 'mundo' }))
    expect(result).toEqual({ ok: false, error: 'El archivo no tiene datos de Mi Progreso.' })
  })

  it('el respaldo incluye una marca de la app y la fecha', () => {
    const parsed = JSON.parse(serializeBackup(sampleData(), EXPORTED_AT))
    expect(parsed.app).toBe('mi-progreso')
    expect(parsed.exportedAt).toBe(EXPORTED_AT)
  })
})
