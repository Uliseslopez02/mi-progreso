import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveTextFile } from '../storage/claudeDownloads'

afterEach(() => {
  delete window.claude
  vi.restoreAllMocks()
})

describe('saveTextFile fuera de un Artifact (window.claude no existe)', () => {
  it('descarga vía blob + anchor', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })

    const outcome = await saveTextFile('archivo.json', '{"a":1}')

    expect(outcome).toEqual({ ok: true })
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')

    vi.unstubAllGlobals()
  })
})

describe('saveTextFile dentro de un Artifact (window.claude.use disponible)', () => {
  it('usa la capacidad downloads en lugar del anchor', async () => {
    const save = vi.fn().mockResolvedValue({ status: 'saved' })
    window.claude = { use: vi.fn().mockResolvedValue({ save }) }
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const outcome = await saveTextFile('archivo.json', '{"a":1}')

    expect(outcome).toEqual({ ok: true })
    expect(save).toHaveBeenCalledWith({ filename: 'archivo.json', data: '{"a":1}' })
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('si el visor rechaza la descarga, informa "declined"', async () => {
    const save = vi.fn().mockRejectedValue({ code: 'declined' })
    window.claude = { use: vi.fn().mockResolvedValue({ save }) }

    expect(await saveTextFile('archivo.json', '{}')).toEqual({ ok: false, reason: 'declined' })
  })

  it('cualquier otro error se reporta como "error" genérico', async () => {
    const save = vi.fn().mockRejectedValue({ code: 'too_large' })
    window.claude = { use: vi.fn().mockResolvedValue({ save }) }

    expect(await saveTextFile('archivo.json', '{}')).toEqual({ ok: false, reason: 'error' })
  })

  it('si la capacidad no está disponible (use resuelve null), cae al anchor', async () => {
    window.claude = { use: vi.fn().mockResolvedValue(null) }
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })

    const outcome = await saveTextFile('archivo.json', '{}')

    expect(outcome).toEqual({ ok: true })
    expect(clickSpy).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })

  it('si use() mismo tira una excepción, cae al anchor sin romper', async () => {
    window.claude = { use: vi.fn().mockRejectedValue(new Error('no disponible')) }
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })

    const outcome = await saveTextFile('archivo.json', '{}')

    expect(outcome).toEqual({ ok: true })
    expect(clickSpy).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })
})
