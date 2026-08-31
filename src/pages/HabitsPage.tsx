import { useMemo, useRef, useState } from 'react'
import { GoalList } from '../components/GoalList'
import { HabitCard } from '../components/HabitCard'
import { HabitInsightsCard } from '../components/HabitInsightsCard'
import { SelectMenu } from '../components/SelectMenu'
import { WEEKDAY_KEYS, weekdayInitials } from '../domain/date'
import { frequencyFrom, type FrequencyType } from '../domain/habits'
import { createId } from '../domain/id'
import { useAppData } from '../state/context'

const FREQUENCY_OPTIONS: Array<{ value: FrequencyType; label: string }> = [
  { value: 'daily', label: 'Todos los días' },
  { value: 'daysOfWeek', label: 'Días específicos' },
  { value: 'timesPerWeek', label: 'N veces por semana' },
  { value: 'monthly', label: 'Mensual' },
]

/** Panel de Hábitos: marcar los de hoy, crear hábitos nuevos y editar los
 * existentes — única fuente de verdad para hábitos en toda la app (la edición
 * ya no vive también en Ajustes). */
export function HabitsPage() {
  const { data, today, dispatch } = useAppData()
  const record = data.days[today]
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitCategory, setNewHabitCategory] = useState(data.categories[0]?.id ?? '')
  const [newHabitFrequencyType, setNewHabitFrequencyType] = useState<FrequencyType>('daily')
  const [newHabitDays, setNewHabitDays] = useState<string[]>([])
  const [newHabitTimesPerWeek, setNewHabitTimesPerWeek] = useState(3)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const categories = useMemo(() => [...data.categories].sort((a, b) => a.order - b.order), [data.categories])

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

  const toggleNewHabitDay = (day: string) => {
    setNewHabitDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    )
  }

  const addHabit = () => {
    const name = newHabitName.trim()
    if (!name) return
    let categoryId = newHabitCategory
    if (!categoryId) {
      categoryId = data.categories[0]?.id ?? createId('cat')
      if (!data.categories[0]) {
        dispatch({ type: 'addCategory', category: { id: categoryId, name: 'General', order: 0 } })
      }
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
        frequency: frequencyFrom(newHabitFrequencyType, newHabitDays, newHabitTimesPerWeek),
      },
    })
    setNewHabitName('')
    setNewHabitFrequencyType('daily')
    setNewHabitDays([])
    setNewHabitTimesPerWeek(3)
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
              categories={categories}
              days={data.days}
              today={today}
              onUpdate={(patch) => dispatch({ type: 'updateGoal', id: habit.id, patch })}
              onRemove={() => dispatch({ type: 'removeGoal', id: habit.id })}
            />
          ))
        )}
      </section>

      <HabitInsightsCard data={data} today={today} />

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Nuevo hábito</h2>
        </div>
        <div className="row">
          <div className="field" style={{ flex: '2 1 220px' }}>
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
          <SelectMenu
            value={newHabitCategory}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            onChange={setNewHabitCategory}
            ariaLabel="Categoría del nuevo hábito"
          />
          <SelectMenu
            value={newHabitFrequencyType}
            options={FREQUENCY_OPTIONS}
            onChange={setNewHabitFrequencyType}
            ariaLabel="Repetición del nuevo hábito"
          />
          {newHabitFrequencyType === 'daysOfWeek' && (
            <div className="chip-list" role="group" aria-label="Días del nuevo hábito">
              {WEEKDAY_KEYS.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  className={`btn btn--ghost${newHabitDays.includes(day) ? ' btn--primary' : ''}`}
                  style={{ padding: '4px 10px' }}
                  onClick={() => toggleNewHabitDay(day)}
                >
                  {weekdayInitials[i]}
                </button>
              ))}
            </div>
          )}
          {newHabitFrequencyType === 'timesPerWeek' && (
            <div className="field" style={{ flex: '0 0 90px' }}>
              <label className="field__label" htmlFor="new-habit-times">
                Veces
              </label>
              <input
                id="new-habit-times"
                className="input"
                type="number"
                min={1}
                max={7}
                value={newHabitTimesPerWeek}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  setNewHabitTimesPerWeek(Number.isFinite(value) ? Math.min(7, Math.max(1, value)) : 3)
                }}
              />
            </div>
          )}
          <button type="button" className="btn btn--primary" onClick={addHabit}>
            Crear hábito
          </button>
        </div>
      </section>
    </div>
  )
}
