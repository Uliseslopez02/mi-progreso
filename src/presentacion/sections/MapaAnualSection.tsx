import { useMemo, useState } from 'react'
import { HabitYearHeatmap } from '../../components/HabitYearHeatmap'
import { Stat } from '../../components/Stat'
import { habitYearMap, habitYearSummary } from '../../domain/habitYearMap'
import { SectionFrame } from '../SectionFrame'
import { usePresentacion } from '../PresentacionState'
import { DEMO_CATEGORIES, TODAY } from '../demoData'

/**
 * Recreación de Historial → Mapa anual: el mismo `<HabitYearHeatmap>` (53
 * semanas, estilo GitHub) y `habitYearMap`/`habitYearSummary` de la app, un
 * hábito a la vez con selector por categoría. La demo sólo tiene 45 días de
 * historial fabricado, así que la mayoría de las semanas aparecen "sin
 * registro" — igual que le pasaría a una cuenta nueva real.
 */
export function MapaAnualSection() {
  const { goals, days } = usePresentacion()
  const [categoryId, setCategoryId] = useState('')
  const [habitId, setHabitId] = useState('')

  const habits = useMemo(
    () => goals.filter((g) => g.trackingKind === 'habit').sort((a, b) => a.order - b.order),
    [goals],
  )
  const categoriesWithHabits = useMemo(() => {
    const ids = new Set(habits.map((h) => h.categoryId))
    return DEMO_CATEGORIES.filter((c) => ids.has(c.id))
  }, [habits])
  const filteredHabits = useMemo(
    () => habits.filter((h) => !categoryId || h.categoryId === categoryId),
    [habits, categoryId],
  )
  const selectedHabit = filteredHabits.find((h) => h.id === habitId) ?? filteredHabits[0] ?? null

  const weeks = useMemo(
    () => (selectedHabit ? habitYearMap(days, selectedHabit.id, TODAY) : []),
    [days, selectedHabit],
  )
  const summary = useMemo(() => habitYearSummary(weeks), [weeks])

  return (
    <SectionFrame
      eyebrow="Todo el año"
      title="Mapa anual: el patrón de un hábito, de un vistazo."
      subtitle="Un heatmap estilo GitHub de las últimas 53 semanas — elegís el hábito y ves exactamente qué días se cumplieron."
      className="pr-mapa-anual"
    >
      <section className="card">
        <div className="card__header">
          <h3 className="card__title">Mapa anual</h3>
        </div>

        <div className="row">
          <div className="field" style={{ flex: '1 1 200px' }}>
            <label className="field__label" htmlFor="pr-year-map-category">
              Categoría
            </label>
            <select
              id="pr-year-map-category"
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
            <label className="field__label" htmlFor="pr-year-map-habit">
              Hábito
            </label>
            <select
              id="pr-year-map-habit"
              className="select"
              value={selectedHabit?.id ?? ''}
              onChange={(e) => setHabitId(e.target.value)}
            >
              {filteredHabits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
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
    </SectionFrame>
  )
}
