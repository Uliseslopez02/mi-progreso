import { useEffect, useState } from 'react'
import { suggestHabits } from '../domain/habitSuggestions'
import { Modal } from './Modal'

interface SuggestionItem {
  text: string
  checked: boolean
}

interface Props {
  goalName: string
  categoryName?: string
  onConfirm: (habitNames: string[], driveProgress: boolean) => void
  onSkip: () => void
}

/**
 * Se abre después de crear una meta: pide a la API de Claude (vía
 * `/api/suggest-habits`) hábitos sugeridos para lograrla, y deja elegir/editar
 * cuáles crear y vincular. Nunca bloquea la creación de la meta — si el
 * servicio falla o no hay sugerencias, "Ahora no" cierra sin efecto.
 */
export function HabitSuggestionModal({ goalName, categoryName, onConfirm, onSkip }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [items, setItems] = useState<SuggestionItem[]>([])
  const [driveProgress, setDriveProgress] = useState(true)

  useEffect(() => {
    let cancelled = false
    suggestHabits(goalName, categoryName).then((result) => {
      if (cancelled) return
      if (result.ok && result.suggestions.length > 0) {
        setItems(result.suggestions.map((text) => ({ text, checked: true })))
        setStatus('ready')
      } else {
        setErrorMessage(result.ok ? 'No se generaron sugerencias para esta meta.' : result.error)
        setStatus('error')
      }
    })
    return () => {
      cancelled = true
    }
  }, [goalName, categoryName])

  const updateItem = (index: number, patch: Partial<SuggestionItem>) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const confirm = () => {
    const names = items.filter((i) => i.checked && i.text.trim().length > 0).map((i) => i.text.trim())
    if (names.length === 0) {
      onSkip()
      return
    }
    onConfirm(names, driveProgress)
  }

  return (
    <Modal title="Hábitos sugeridos" onClose={onSkip}>
      <p className="card__hint">
        Para alcanzar &quot;{goalName}&quot;, te sugerimos incorporar estos hábitos diarios:
      </p>

      {status === 'loading' && <p className="habit-suggestions__loading">Pensando sugerencias…</p>}

      {status === 'error' && <p className="empty">{errorMessage}</p>}

      {status === 'ready' && (
        <>
          <div className="habit-suggestions">
            {items.map((item, index) => (
              <label className="habit-suggestion" key={index}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => updateItem(index, { checked: !item.checked })}
                  aria-label={`Incluir ${item.text}`}
                />
                <input
                  className="input"
                  value={item.text}
                  onChange={(e) => updateItem(index, { text: e.target.value })}
                  aria-label="Nombre del hábito sugerido"
                />
              </label>
            ))}
          </div>

          <label className="row" style={{ alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={driveProgress}
              onChange={(e) => setDriveProgress(e.target.checked)}
            />
            <span className="card__hint">Actualizar el % de la meta automáticamente según estos hábitos</span>
          </label>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn--ghost" onClick={onSkip}>
              Ahora no
            </button>
            <button type="button" className="btn btn--primary" onClick={confirm}>
              Agregar hábitos
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
