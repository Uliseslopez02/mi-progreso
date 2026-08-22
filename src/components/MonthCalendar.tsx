import type { DateKey } from '../domain/date'
import { diffDays, formatMonthYear, fromDateKey, monthDays, weekdayInitials } from '../domain/date'
import { bandForPercent, computeDayStats } from '../domain/scoring'
import type { DayRecord } from '../domain/types'
import { BAND_COLOR, BAND_LEGEND } from './colors'

interface Props {
  monthKey: DateKey
  days: Record<string, DayRecord>
  today: DateKey
  selected: DateKey | null
  onSelect: (date: DateKey) => void
  onMonthChange: (delta: number) => void
}

export function MonthCalendar({ monthKey, days, today, selected, onSelect, onMonthChange }: Props) {
  const dates = monthDays(monthKey)
  const firstWeekday = (fromDateKey(dates[0]).getDay() + 6) % 7 // 0 = lunes
  const isCurrentMonth = monthKey.slice(0, 7) === today.slice(0, 7)

  return (
    <div>
      <div className="calendar__head">
        <h2 className="calendar__title">{formatMonthYear(monthKey)}</h2>
        <div className="calendar__nav">
          <button
            type="button"
            className="icon-btn"
            onClick={() => onMonthChange(-1)}
            aria-label="Mes anterior"
          >
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
          const record = days[date]
          const stats = computeDayStats(record)
          const future = diffDays(today, date) > 0
          const band = bandForPercent(stats.percent, Boolean(record))
          const classes = [
            'calendar__day',
            date === today ? 'calendar__day--today' : '',
            date === selected ? 'calendar__day--selected' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={date}
              type="button"
              className={classes}
              disabled={future}
              onClick={() => onSelect(date)}
              aria-label={`${fromDateKey(date).getDate()} — ${record ? `${stats.percent}%` : 'sin registro'}`}
            >
              <span className="numeric">{fromDateKey(date).getDate()}</span>
              <span className="calendar__dot" style={{ background: BAND_COLOR[band] }} />
            </button>
          )
        })}
      </div>

      <div className="legend">
        {BAND_LEGEND.map((item) => (
          <span className="legend__item" key={item.band}>
            <span className="legend__swatch" style={{ background: BAND_COLOR[item.band] }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
