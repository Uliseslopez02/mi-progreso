import { useMemo } from 'react'
import { DayTimeline } from '../../components/DayTimeline'
import { formatLongDate } from '../../domain/date'
import { SectionFrame } from '../SectionFrame'
import { TODAY } from '../demoData'
import { usePresentacion } from '../PresentacionState'

/**
 * Recreación de la Agenda del día (Agenda → Día): el mismo `<DayTimeline>` de
 * la app — grilla de 06 a 23 h, bloques con hora y duración que se arrastran
 * (mover la hora) o se estiran del borde inferior (cambiar la duración), tareas
 * sin horario aparte, y las acciones reales por ítem: completar, duplicar,
 * posponer, eliminar. Marcar una tarea vinculada a un hábito lo marca también.
 */
export function AgendaSection() {
  const {
    goals,
    plannerItems,
    togglePlannerItem,
    removePlannerItem,
    duplicatePlannerItem,
    postponePlannerItem,
    movePlannerItem,
    resizePlannerItem,
  } = usePresentacion()

  const habitNameById = useMemo(
    () => Object.fromEntries(goals.filter((g) => g.trackingKind === 'habit').map((h) => [h.id, h.name])),
    [goals],
  )
  const items = useMemo(
    () => plannerItems.filter((i) => i.date === TODAY).sort((a, b) => a.order - b.order),
    [plannerItems],
  )
  const nowMinutes = useMemo(() => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  }, [])

  return (
    <SectionFrame
      eyebrow="Tu semana"
      title="Agenda: lo que sí tiene día y hora."
      subtitle="Arrastrá un bloque para mover la hora, o su borde inferior para cambiar la duración. Cada ítem se puede completar, duplicar, posponer a mañana o eliminar."
      className="pr-agenda"
    >
      <section className="card">
        <div className="card__header">
          <h3 className="card__title">Agenda del día</h3>
          <span className="card__hint">{formatLongDate(TODAY)}</span>
        </div>
        <DayTimeline
          items={items}
          nowMinutes={nowMinutes}
          habitNameById={habitNameById}
          onToggle={togglePlannerItem}
          onRemove={removePlannerItem}
          onDuplicate={duplicatePlannerItem}
          onPostpone={postponePlannerItem}
          onMove={movePlannerItem}
          onResize={resizePlannerItem}
        />
      </section>
      <p className="pr-agenda__note">
        Además de la vista de Día está la de Mes (un punto por día según cuánto planificaste y
        cumpliste) y el Planificador semanal, donde repartís las tareas entre los 7 días
        arrastrándolas de una columna a otra.
      </p>
    </SectionFrame>
  )
}
