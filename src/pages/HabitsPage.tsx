import { useMemo } from 'react'
import { GoalList } from '../components/GoalList'
import { HabitCard } from '../components/HabitCard'
import { useAppData } from '../state/context'

/** Panel de Hábitos: marcar los de hoy, y ver racha/consistencia de cada uno. */
export function HabitsPage() {
  const { data, today, dispatch } = useAppData()
  const record = data.days[today]

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
          <p className="empty">
            Todavía no creaste ningún hábito. Agregá el primero en Ajustes.
          </p>
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
    </div>
  )
}
