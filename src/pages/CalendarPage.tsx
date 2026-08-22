import { useState } from 'react'
import { DayDetail } from '../components/DayDetail'
import { MonthCalendar } from '../components/MonthCalendar'
import { addMonths, startOfMonth } from '../domain/date'
import type { DateKey } from '../domain/date'
import { useAppData } from '../state/context'

export function CalendarPage() {
  const { data, today, dispatch } = useAppData()
  const [monthKey, setMonthKey] = useState<DateKey>(() => startOfMonth(today))
  const [selected, setSelected] = useState<DateKey>(today)

  const editable = selected === today || data.settings.allowEditingPastDays

  return (
    <div className="stack">
      <section className="card">
        <MonthCalendar
          monthKey={monthKey}
          days={data.days}
          today={today}
          selected={selected}
          onSelect={setSelected}
          onMonthChange={(delta) => setMonthKey((current) => addMonths(current, delta))}
        />
      </section>

      <DayDetail
        date={selected}
        record={data.days[selected]}
        editable={editable}
        onToggle={(goalId) => dispatch({ type: 'toggleGoal', date: selected, goalId })}
        onProgressChange={(goalId, value) =>
          dispatch({ type: 'setGoalProgress', date: selected, goalId, value })
        }
      />

      {!editable && data.days[selected] && (
        <p className="card__hint" style={{ textAlign: 'center' }}>
          Los días anteriores son sólo lectura. Podés habilitar la corrección en Ajustes.
        </p>
      )}
    </div>
  )
}
