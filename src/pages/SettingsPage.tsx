import { useRef, useState } from 'react'
import { Toggle } from '../components/Toggle'
import { CATEGORY_COLOR_NAMES, CATEGORY_PALETTE } from '../domain/categoryColors'
import { createEmptyData } from '../domain/defaults'
import { NAV_TABS, orderTabs } from '../domain/navigation'
import { createId } from '../domain/id'
import { signOut } from '../auth/supabaseAuth'
import { backupFileName, parseBackup, readFileText, serializeBackup } from '../storage/backup'
import { saveTextFile } from '../storage/claudeDownloads'
import { useAppData } from '../state/context'

export function SettingsPage() {
  const { data, plan, dispatch } = useAppData()
  const [newCategory, setNewCategory] = useState('')
  const [backupMessage, setBackupMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(
    null,
  )
  const fileInput = useRef<HTMLInputElement>(null)

  const exportData = async () => {
    const exportedAt = new Date().toISOString()
    const filename = backupFileName(exportedAt)
    const outcome = await saveTextFile(filename, serializeBackup(data, exportedAt))

    if (!outcome.ok) {
      setBackupMessage({
        tone: 'error',
        text:
          outcome.reason === 'declined'
            ? 'Descarga cancelada.'
            : 'No se pudo descargar el respaldo.',
      })
      return
    }
    setBackupMessage({ tone: 'ok', text: `Respaldo descargado: ${filename}` })
  }

  const importData = async (file: File) => {
    const result = parseBackup(await readFileText(file))
    if (!result.ok) {
      setBackupMessage({ tone: 'error', text: result.error })
      return
    }
    const dias = Object.keys(result.data.days).length
    if (!window.confirm(`Vas a reemplazar tus datos actuales por ${dias} día(s) del archivo. ¿Seguir?`)) {
      setBackupMessage(null)
      return
    }
    dispatch({ type: 'replaceData', data: result.data })
    setBackupMessage({ tone: 'ok', text: `Datos restaurados: ${dias} día(s) de historial.` })
  }

  const categories = [...data.categories].sort((a, b) => a.order - b.order)

  const navTabs = orderTabs(NAV_TABS, data.settings.navOrder)

  const moveTab = (path: string, direction: -1 | 1) => {
    const order = navTabs.map((t) => t.path)
    const index = order.indexOf(path)
    const target = index + direction
    if (target < 0 || target >= order.length) return
    const next = [...order]
    ;[next[index], next[target]] = [next[target], next[index]]
    dispatch({ type: 'updateSettings', patch: { navOrder: next } })
  }

  const addCategory = () => {
    const name = newCategory.trim()
    if (!name) return
    dispatch({
      type: 'addCategory',
      category: { id: createId('cat'), name, order: categories.length },
    })
    setNewCategory('')
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">General</h2>
        </div>
        <div className="stack" style={{ gap: 18 }}>
          <div className="field" style={{ maxWidth: 340 }}>
            <label className="field__label" htmlFor="app-name">
              Nombre de la aplicación
            </label>
            <input
              id="app-name"
              className="input"
              value={data.settings.appName}
              onChange={(e) => dispatch({ type: 'updateSettings', patch: { appName: e.target.value } })}
            />
          </div>

          <div className="field" style={{ maxWidth: 340 }}>
            <label className="field__label" htmlFor="streak-threshold">
              Porcentaje mínimo para mantener la racha
            </label>
            <div className="row">
              <input
                id="streak-threshold"
                className="input"
                type="number"
                min={1}
                max={100}
                style={{ width: 110 }}
                value={data.settings.streakThreshold}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  if (!Number.isFinite(value)) return
                  dispatch({
                    type: 'updateSettings',
                    patch: { streakThreshold: Math.min(100, Math.max(1, Math.round(value))) },
                  })
                }}
              />
              <span className="card__hint">Un día cuenta para la racha si llega a este valor.</span>
            </div>
          </div>

          <Toggle
            checked={data.settings.allowEditingPastDays}
            onChange={(checked) =>
              dispatch({ type: 'updateSettings', patch: { allowEditingPastDays: checked } })
            }
            label="Permitir corregir días anteriores"
          />
        </div>
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Navegación</h2>
          <span className="card__hint">Orden de las pestañas principales.</span>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {navTabs.map((tab, index) => (
            <div key={tab.path} className="settings-goal">
              <span style={{ flex: 1 }}>{tab.label}</span>
              <div className="settings-goal__actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Subir ${tab.label}`}
                  disabled={index === 0}
                  onClick={() => moveTab(tab.path, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Bajar ${tab.label}`}
                  disabled={index === navTabs.length - 1}
                  onClick={() => moveTab(tab.path, 1)}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Categorías</h2>
          <span className="card__hint">Eliminar una categoría elimina sus objetivos.</span>
        </div>

        <div className="chip-list">
          {categories.map((category) => (
            <span
              className="category-chip"
              key={category.id}
              style={category.color ? { borderColor: category.color } : undefined}
            >
              <div className="category-chip__main">
                <input
                  className="input"
                  aria-label={`Nombre de ${category.name}`}
                  style={{ width: 170, padding: '4px 8px', background: 'transparent', border: 0 }}
                  value={category.name}
                  onChange={(e) =>
                    dispatch({
                      type: 'updateCategory',
                      id: category.id,
                      patch: { name: e.target.value },
                    })
                  }
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Eliminar ${category.name}`}
                  onClick={() => dispatch({ type: 'removeCategory', id: category.id })}
                >
                  ×
                </button>
              </div>
              <div className="category-chip__swatches" role="group" aria-label={`Color de ${category.name}`}>
                {CATEGORY_PALETTE.map((color) => {
                  const active = category.color === color
                  return (
                    <button
                      key={color}
                      type="button"
                      className={`category-chip__swatch${active ? ' category-chip__swatch--active' : ''}`}
                      style={{ background: color, boxShadow: active ? `0 0 0 4px ${color}40` : undefined }}
                      aria-pressed={active}
                      aria-label={`Usar ${CATEGORY_COLOR_NAMES[color]} para ${category.name}`}
                      onClick={() =>
                        dispatch({
                          type: 'updateCategory',
                          id: category.id,
                          patch: { color: active ? undefined : color },
                        })
                      }
                    >
                      {active && <span aria-hidden="true">✓</span>}
                    </button>
                  )
                })}
              </div>
            </span>
          ))}
        </div>

        <div className="row" style={{ marginTop: 16 }}>
          <div className="field" style={{ flex: '1 1 240px', maxWidth: 320 }}>
            <label className="field__label" htmlFor="new-category">
              Nueva categoría
            </label>
            <input
              id="new-category"
              className="input"
              placeholder="Ej. Descanso"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCategory()
              }}
            />
          </div>
          <button type="button" className="btn" onClick={addCategory}>
            Agregar categoría
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Datos</h2>
          <span className="card__hint">
            Todo se guarda en este navegador: el respaldo es la forma de llevarlo a otro lado.
          </span>
        </div>

        <div className="row">
          <button type="button" className="btn btn--primary" onClick={exportData}>
            Exportar respaldo
          </button>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            Importar respaldo
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            aria-label="Archivo de respaldo"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void importData(file)
            }}
          />
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              if (!window.confirm('Esto borra objetivos, historial y ajustes. ¿Continuar?')) return
              dispatch({ type: 'replaceData', data: createEmptyData(new Date().toISOString()) })
              setBackupMessage(null)
            }}
          >
            Borrar todos los datos
          </button>
        </div>

        {backupMessage && (
          <p
            role="status"
            className="card__hint"
            style={{
              marginTop: 12,
              color: backupMessage.tone === 'error' ? '#fca5a5' : 'var(--accent)',
            }}
          >
            {backupMessage.text}
          </p>
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Cuenta</h2>
          <span className={`pill pill--${plan === 'premium' ? 'personal' : 'professional'}`}>
            {plan === 'premium' ? 'Premium' : 'Free'}
          </span>
        </div>
        <div className="row">
          <button type="button" className="btn btn--ghost" onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        </div>
      </section>
    </div>
  )
}
