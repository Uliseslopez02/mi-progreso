/**
 * Cuando la app corre publicada como Claude Artifact, el sandbox bloquea la
 * descarga directa (<a download>, Blob URLs): hay que ofrecer el archivo vía
 * window.claude.use('downloads'). Fuera de ese contexto (npm run dev, un
 * build normal) window.claude no existe, así que se usa el enlace de siempre.
 */

interface DownloadsNamespace {
  save(request: { filename: string; data: string }): Promise<{ status: 'saved' }>
}

interface ClaudeGlobal {
  use?: (name: string) => Promise<DownloadsNamespace | null>
}

declare global {
  interface Window {
    claude?: ClaudeGlobal
  }
}

export type SaveOutcome = { ok: true } | { ok: false; reason: 'declined' | 'error' }

/** Ofrece un archivo de texto para guardar, usando la capacidad de Claude si está disponible. */
export async function saveTextFile(filename: string, content: string): Promise<SaveOutcome> {
  const namespace = await getDownloadsNamespace()

  if (namespace) {
    try {
      await namespace.save({ filename, data: content })
      return { ok: true }
    } catch (err) {
      const code = (err as { code?: string } | undefined)?.code
      return { ok: false, reason: code === 'declined' ? 'declined' : 'error' }
    }
  }

  downloadViaAnchor(filename, content)
  return { ok: true }
}

async function getDownloadsNamespace(): Promise<DownloadsNamespace | null> {
  if (!window.claude?.use) return null
  try {
    return await window.claude.use('downloads')
  } catch {
    return null
  }
}

function downloadViaAnchor(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
