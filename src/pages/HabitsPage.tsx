import { useMemo, useRef, useState } from 'react'
import { GoalList } from '../components/GoalList'
import { HabitCard } from '../components/HabitCard'
import { createId } from '../domain/id'
import { useAppData } from '../state/context'

/** Panel de Hábitos: marcar los de hoy, y ver racha/consistencia de cada uno. */
export function HabitsPage() {
  const { data, today, dispatch } = useAppData()
  const record = data.days[today]
  const [newHabitName, setNewHabitName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const categoryName = useMemo(() => {
    const map = new Map(data.categories.map((c) => [c.id, c.name]))
    return (id: string) => map.get(id) ?? 'Sin categoría'
  }, [data.categories])

  const todayHabits = useMemo(
    () => (record?.goals ?? []).filter((g) => g.trackingKind === 'habit'),
    [record?.goals],
  )

  const habits = useMemo(
    () =>
      [...data.goals]
        .filter((g) => g.trackingKind === 'habit')
        .sort((a, b) => a.order - b.order),
    [data.goals],
  )

  const focusNewHabit = () => {
    nameInputRef.current?.focus()
    nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const addHabit = () => {
    const name = newHabitName.trim()
    if (!name) return
    const categoryId = data.categories[0]?.id ?? createId('cat')
    if (!data.categories[0]) {
      dispatch({ type: 'addCategory', category: { id: categoryId, name: 'General', order: 0 } })
    }
    dispatch({
      type: 'addGoal',
      goal: {
        id: createId('habit'),
        name,
        categoryId,
        weight: 1,
        active: true,
        period: 'daily',
        order: habits.length,
        createdAt: new Date().toISOString(),
        kind: 'boolean',
        trackingKind: 'habit',
      },
    })
    setNewHabitName('')
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Hábitos de hoy</h2>
        </div>
        <GoalList
          goals={todayHabits}
          goalProgress={record?.goalProgress ?? {}}
          onToggle={(goalId) => dispatch({ type: 'toggleGoal', date: today, goalId })}
          onProgressChange={(goalId, value) =>
            dispatch({ type: 'setGoalProgress', date: today, goalId, value })
          }
          emptyMessage="Todavía no tenés hábitos para hoy."
          emptyAction={{ label: '+ Crear nuevo hábito', onClick: focusNewHabit }}
        />
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Tus hábitos</h2>
          <span className="card__hint">
            {habits.filter((h) => h.active).length} activos de {habits.length}
          </span>
        </div>

        {habits.length === 0 ? (
          <div className="empty-state">
            <p className="empty">Todavía no creaste ningún hábito.</p>
            <button type="button" className="btn btn--primary" onClick={focusNewHabit}>
              + Crear nuevo hábito
            </button>
          </div>
        ) : (
          habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              categoryName={categoryName(habit.categoryId)}
              days={data.days}
              today={today}
            />
          ))
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Nuevo hábito</h2>
        </div>
        <div className="row">
          <div className="field" style={{ flex: '2 1 260px' }}>
            <label className="field__label" htmlFor="new-habit-name">
              Nombre
            </label>
            <input
              id="new-habit-name"
              ref={nameInputRef}
              className="input"
              placeholder="Ej. Meditar 10 minutos"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addHabit()
              }}
            />
          </div>
          <button type="button" className="btn btn--primary" onClick={addHabit}>
            Crear hábito
          </button>
        </div>
        <p className="card__hint" style={{ marginTop: 8 }}>
          Frecuencia y otras opciones avanzadas: Ajustes.
        </p>
      </section>
    </div>
  )
}
