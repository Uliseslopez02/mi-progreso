import { formatMonthYear, fromDateKey, monthDays, weekdayInitials, type DateKey } from '../domain/date'
import type { PlannerItem } from '../domain/types'

interface Props {
  monthKey: DateKey
  today: DateKey
  itemsByDay: Record<DateKey, PlannerItem[]>
  onSelect: (date: DateKey) => void
  onMonthChange: (delta: number) => void
}

/** Grilla mensual de la Agenda: un punto por día según cuántos ítems tiene planificados. */
export function MonthAgenda({ monthKey, today, itemsByDay, onSelect, onMonthChange }: Props) {
  const dates = monthDays(monthKey)
  const firstWeekday = (fromDateKey(dates[0]).getDay() + 6) % 7 // 0 = lunes
  const isCurrentMonth = monthKey.slice(0, 7) === today.slice(0, 7)

  return (
    <div>
      <div className="calendar__head">
        <h2 className="calendar__title">{formatMonthYear(monthKey)}</h2>
        <div className="calendar__nav">
          <button type="button" className="icon-btn" onClick={() => onMonthChange(-1)} aria-label="Mes anterior">
            ‹
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => onMonthChange(1)}
            disabled={isCurrentMonth}
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>
      </div>

      <div className="calendar__grid">
        {weekdayInitials.map((initial, i) => (
          <div className="calendar__dow" key={`${initial}-${i}`}>
            {initial}
          </div>
        ))}

        {Array.from({ length: firstWeekday }, (_, i) => (
          <div key={`blank-${i}`} aria-hidden="true" />
        ))}

        {dates.map((date) => {
          const items = itemsByDay[date] ?? []
          const done = items.filter((i) => i.done).length
          const classes = ['calendar__day', date === today ? 'calendar__day--today' : ''].filter(Boolean).join(' ')

          let dotColor: string | null = null
          if (items.length > 0) dotColor = done === items.length ? 'var(--accent)' : 'var(--text-dim)'

          return (
            <button
              key={date}
              type="button"
              className={classes}
              onClick={() => onSelect(date)}
              aria-label={`${fromDateKey(date).getDate()} — ${items.length === 0 ? 'sin actividades' : `${done} de ${items.length} realizadas`}`}
            >
              <span className="numeric">{fromDateKey(date).getDate()}</span>
              {dotColor && <span className="calendar__dot" style={{ background: dotColor }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
