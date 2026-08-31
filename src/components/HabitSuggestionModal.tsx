import { useEffect, useState } from 'react'
import { suggestHabits } from '../domain/habitSuggestions'
import type { GoalFrequency } from '../domain/types'
import { Modal } from './Modal'

interface SuggestionItem {
  text: string
  checked: boolean
  /** 1-7 veces por semana (7 = todos los días). Editable antes de confirmar. */
  timesPerWeek: number
}

export interface ConfirmedHabit {
  name: string
  frequency: GoalFrequency | undefined
}

interface Props {
  goalName: string
  categoryName?: string
  onConfirm: (habits: ConfirmedHabit[], driveProgress: boolean) => void
  onSkip: () => void
}

/** 7 veces por semana = diario, igual criterio que `frequencyFrom` en domain/habits.ts. */
function frequencyForTimesPerWeek(timesPerWeek: number): GoalFrequency | undefined {
  return timesPerWeek >= 7 ? undefined : { type: 'timesPerWeek', timesPerWeek }
}

/**
 * Se abre después de crear una meta: pide a la API de Claude (vía
 * `/api/suggest-habits`) hábitos sugeridos para lograrla, con una frecuencia
 * propuesta por hábito, y deja elegir/editar cuáles crear, con qué frecuencia,
 * y vincularlos. Nunca bloquea la creación de la meta — si el servicio falla o
 * no hay sugerencias, "Ahora no" cierra sin efecto.
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
        setItems(result.suggestions.map((s) => ({ text: s.text, checked: true, timesPerWeek: s.timesPerWeek })))
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
    const habits = items
      .filter((i) => i.checked && i.text.trim().length > 0)
      .map((i) => ({ name: i.text.trim(), frequency: frequencyForTimesPerWeek(i.timesPerWeek) }))
    if (habits.length === 0) {
      onSkip()
      return
    }
    onConfirm(habits, driveProgress)
  }

  return (
    <Modal
      title="Hábitos sugeridos"
      onClose={onSkip}
      footer={
        status === 'ready' ? (
          <>
            <button type="button" className="btn btn--ghost" onClick={onSkip}>
              Ahora no
            </button>
            <button type="button" className="btn btn--primary" onClick={confirm}>
              Agregar hábitos
            </button>
          </>
        ) : undefined
      }
    >
      <p className="card__hint">
        Para alcanzar &quot;{goalName}&quot;, te sugerimos incorporar estos hábitos:
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
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={7}
                  style={{ width: 56, flex: 'none' }}
                  value={item.timesPerWeek}
                  aria-label={`Veces por semana de ${item.text}`}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    if (!Number.isFinite(value)) return
                    updateItem(index, { timesPerWeek: Math.min(7, Math.max(1, value)) })
                  }}
                />
                <span className="card__hint">{item.timesPerWeek === 7 ? 'todos los días' : 'veces/sem'}</span>
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
        </>
      )}
    </Modal>
  )
}
