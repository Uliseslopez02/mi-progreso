import type { AppData } from '../domain/types'
import { migrate } from './localStorageRepository'

/**
 * Respaldo manual. Como los datos viven en el navegador, esto es lo que permite
 * llevarlos a otra PC o al celular, y no perderlos si se limpia el navegador.
 */

export interface BackupFile {
  app: 'mi-progreso'
  exportedAt: string
  data: AppData
}

export function serializeBackup(data: AppData, exportedAt: string): string {
  const backup: BackupFile = { app: 'mi-progreso', exportedAt, data }
  return JSON.stringify(backup, null, 2)
}

export function backupFileName(exportedAt: string): string {
  return `mi-progreso-${exportedAt.slice(0, 10)}.json`
}

/** Lee el archivo elegido. `Blob.text()` no existe en todos lados: FileReader sí. */
export function readFileText(file: Blob): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'))
    reader.readAsText(file)
  })
}

export type ParseResult =
  | { ok: true; data: AppData }
  | { ok: false; error: string }

/** Acepta tanto el archivo de respaldo como un volcado crudo de los datos. */
export function parseBackup(text: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' }
  }

  const candidate =
    parsed && typeof parsed === 'object' && 'data' in parsed
      ? (parsed as { data: unknown }).data
      : parsed

  const data = migrate(candidate)
  if (!data) return { ok: false, error: 'El archivo no tiene datos de Mi Progreso.' }

  return { ok: true, data }
}
