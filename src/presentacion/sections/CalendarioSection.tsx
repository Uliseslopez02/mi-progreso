import { useState } from 'react'
import { DayDetail } from '../../components/DayDetail'
import { MonthCalendar } from '../../components/MonthCalendar'
import { addMonths, startOfMonth, type DateKey } from '../../domain/date'
import { SectionFrame } from '../SectionFrame'
import { usePresentacion } from '../PresentacionState'
import { TODAY } from '../demoData'

/**
 * Recreación de Historial → Calendario: el mismo `<MonthCalendar>` (un punto
 * por día coloreado con la escala de bandas del anillo) y `<DayDetail>` de la
 * app. Tocás un día y ves qué cumpliste — hoy además se puede editar, como en
 * la app real.
 */
export function CalendarioSection() {
  const { days, toggleGoal, setGoalProgress } = usePresentacion()
  const [monthKey, setMonthKey] = useState<DateKey>(() => startOfMonth(TODAY))
  const [selected, setSelected] = useState<DateKey>(TODAY)

  const editable = selected === TODAY

  return (
    <SectionFrame
      eyebrow="Historial"
      title="Calendario: tu mes, coloreado por cumplimiento."
      subtitle="Cada día es un punto con la misma escala de colores del anillo de Hoy. Tocá cualquier día para ver el detalle; hoy además se puede editar."
      className="pr-calendario"
    >
      <section className="card">
        <MonthCalendar
          monthKey={monthKey}
          days={days}
          today={TODAY}
          selected={selected}
          onSelect={setSelected}
          onMonthChange={(delta) => setMonthKey((current) => addMonths(current, delta))}
        />
      </section>

      <DayDetail
        date={selected}
        record={days[selected]}
        editable={editable}
        onToggle={(goalId) => toggleGoal(goalId)}
        onProgressChange={(goalId, value) => setGoalProgress(goalId, value)}
      />

      {!editable && days[selected] && (
        <p className="card__hint" style={{ textAlign: 'center' }}>
          Los días anteriores son sólo lectura acá. En la app se puede habilitar la corrección en Ajustes.
        </p>
      )}
    </SectionFrame>
  )
}
