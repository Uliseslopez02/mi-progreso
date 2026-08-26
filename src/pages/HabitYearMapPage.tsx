import { useMemo, useState } from 'react'
import { HabitYearHeatmap } from '../components/HabitYearHeatmap'
import { Stat } from '../components/Stat'
import { habitYearMap, habitYearSummary } from '../domain/habitYearMap'
import { useAppData } from '../state/context'

/** Mapa anual (estilo GitHub) de un hábito a la vez, elegible por categoría/hábito. */
export function HabitYearMapPage() {
  const { data, today } = useAppData()
  const [categoryId, setCategoryId] = useState('')
  const [habitId, setHabitId] = useState('')

  const habits = useMemo(
    () =>
      [...data.goals]
        .filter((g) => g.trackingKind === 'habit')
        .sort((a, b) => a.order - b.order),
    [data.goals],
  )

  const categoriesWithHabits = useMemo(() => {
    const ids = new Set(habits.map((h) => h.categoryId))
    return data.categories.filter((c) => ids.has(c.id))
  }, [data.categories, habits])

  const filteredHabits = useMemo(
    () => habits.filter((h) => !categoryId || h.categoryId === categoryId),
    [habits, categoryId],
  )

  const selectedHabit = filteredHabits.find((h) => h.id === habitId) ?? filteredHabits[0] ?? null

  const weeks = useMemo(
    () => (selectedHabit ? habitYearMap(data.days, selectedHabit.id, today) : []),
    [data.days, selectedHabit, today],
  )
  const summary = useMemo(() => habitYearSummary(weeks), [weeks])

  if (habits.length === 0) {
    return (
      <div className="stack">
        <section className="card">
          <div className="card__header">
            <h2 className="card__title">Mapa anual</h2>
          </div>
          <p className="empty">Todavía no creaste ningún hábito. Agregá el primero en Ajustes.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Mapa anual</h2>
        </div>

        <div className="row">
          <div className="field" style={{ flex: '1 1 200px' }}>
            <label className="field__label" htmlFor="year-map-category">
              Categoría
            </label>
            <select
              id="year-map-category"
              className="select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categoriesWithHabits.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: '2 1 260px' }}>
            <label className="field__label" htmlFor="year-map-habit">
              Hábito
            </label>
            <select
              id="year-map-habit"
              className="select"
              value={selectedHabit?.id ?? ''}
              onChange={(e) => setHabitId(e.target.value)}
            >
              {filteredHabits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                  {!h.active ? ' (pausado)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedHabit && (
          <>
            <div className="stat-grid" style={{ marginTop: 14 }}>
              <Stat label="Cumplimiento" value={`${summary.percent}%`} />
              <Stat label="Días cumplidos" value={summary.daysCompleted} />
              <Stat label="Días con registro" value={summary.daysPresent} />
            </div>

            <div style={{ marginTop: 16 }}>
              <HabitYearHeatmap weeks={weeks} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}
