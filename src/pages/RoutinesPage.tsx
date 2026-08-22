import { useMemo, useState } from 'react'
import { RoutineCard } from '../components/RoutineCard'
import { RoutineExecutionCard } from '../components/RoutineExecutionCard'
import { RoutineFocusMode } from '../components/RoutineFocusMode'
import { createId } from '../domain/id'
import { getRoutineRun } from '../domain/routine'
import type { RoutineCategory } from '../domain/types'
import { useAppData } from '../state/context'

const CATEGORY_LABEL: Record<RoutineCategory, string> = {
  morning: 'Matutina',
  evening: 'Nocturna',
  workout: 'Entrenamiento',
  work: 'Trabajo',
  custom: 'Personalizada',
}

/** Rutinas: ritual con pasos ordenados, ejecución diaria y modo enfocado. */
export function RoutinesPage() {
  const { data, today, dispatch } = useAppData()
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<RoutineCategory>('morning')
  const [focusRoutineId, setFocusRoutineId] = useState<string | null>(null)

  const routines = useMemo(() => [...data.routines].sort((a, b) => a.order - b.order), [data.routines])
  const activeRoutines = useMemo(() => routines.filter((r) => r.active), [routines])
  const focusRoutine = focusRoutineId ? data.routines.find((r) => r.id === focusRoutineId) : undefined

  const addRoutine = () => {
    const name = newName.trim()
    if (!name) return
    dispatch({
      type: 'addRoutine',
      routine: {
        id: createId('rutina'),
        name,
        category: newCategory,
        steps: [],
        active: true,
        order: data.routines.length,
        createdAt: new Date().toISOString(),
      },
    })
    setNewName('')
  }

  const move = (id: string, direction: -1 | 1) => dispatch({ type: 'moveRoutine', id, direction })
  const toggleStep = (routineId: string, stepId: string) =>
    dispatch({ type: 'toggleRoutineStep', date: today, routineId, stepId })

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Rutinas de hoy</h2>
        </div>
        {activeRoutines.length === 0 ? (
          <p className="empty">No tenés rutinas activas. Creá la primera abajo.</p>
        ) : (
          activeRoutines.map((routine) => (
            <RoutineExecutionCard
              key={routine.id}
              routine={routine}
              run={getRoutineRun(data.routineRuns, routine.id, today)}
              onToggleStep={(stepId) => toggleStep(routine.id, stepId)}
              onOpenFocusMode={() => setFocusRoutineId(routine.id)}
            />
          ))
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Tus rutinas</h2>
          <span className="card__hint">
            {routines.filter((r) => r.active).length} activas de {routines.length}
          </span>
        </div>

        {routines.length === 0 ? (
          <p className="empty">Todavía no creaste ninguna rutina.</p>
        ) : (
          routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onUpdate={(patch) => dispatch({ type: 'updateRoutine', id: routine.id, patch })}
              onRemove={() => dispatch({ type: 'removeRoutine', id: routine.id })}
              onMoveUp={() => move(routine.id, -1)}
              onMoveDown={() => move(routine.id, 1)}
            />
          ))
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Nueva rutina</h2>
        </div>
        <div className="row">
          <div className="field" style={{ flex: '2 1 260px' }}>
            <label className="field__label" htmlFor="new-routine-name">
              Nombre
            </label>
            <input
              id="new-routine-name"
              className="input"
              placeholder="Ej. Ritual matutino"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addRoutine()
              }}
            />
          </div>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label className="field__label" htmlFor="new-routine-category">
              Categoría
            </label>
            <select
              id="new-routine-category"
              className="select"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as RoutineCategory)}
            >
              {(Object.keys(CATEGORY_LABEL) as RoutineCategory[]).map((key) => (
                <option key={key} value={key}>
                  {CATEGORY_LABEL[key]}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn--primary" onClick={addRoutine}>
            Crear rutina
          </button>
        </div>
      </section>

      {focusRoutine && (
        <RoutineFocusMode
          routine={focusRoutine}
          run={getRoutineRun(data.routineRuns, focusRoutine.id, today)}
          onToggleStep={(stepId) => toggleStep(focusRoutine.id, stepId)}
          onClose={() => setFocusRoutineId(null)}
        />
      )}
    </div>
  )
}
