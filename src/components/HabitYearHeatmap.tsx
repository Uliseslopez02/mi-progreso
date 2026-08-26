import { formatMonthYear, formatShortDate, weekdayInitials } from '../domain/date'
import type { YearMapWeek } from '../domain/habitYearMap'
import { BAND_COLOR } from './colors'

interface Props {
  weeks: YearMapWeek[]
}

const STATUS_LABEL: Record<string, string> = {
  done: 'cumplido',
  missed: 'no cumplido',
  'no-record': 'sin registro',
  future: 'todavía no llegó',
}

function monthLabel(mondayKey: string): string {
  return formatMonthYear(mondayKey).split(' ')[0].slice(0, 3)
}

/** Heatmap anual de un hábito, estilo GitHub: columnas = semanas, filas = días lunes→domingo. */
export function HabitYearHeatmap({ weeks }: Props) {
  return (
    <div>
      <div className="year-heatmap__scroll">
        <div className="year-heatmap__months">
          <div className="year-heatmap__dow" aria-hidden="true" />
          {weeks.map((week, i) => (
            <span className="year-heatmap__month-label" key={week.mondayKey}>
              {i === 0 || monthLabel(week.mondayKey) !== monthLabel(weeks[i - 1].mondayKey)
                ? monthLabel(week.mondayKey)
                : ''}
            </span>
          ))}
        </div>

        <div className="year-heatmap__body" aria-hidden="true">
          <div className="year-heatmap__dow">
            {weekdayInitials.map((initial, i) => (
              <span key={`${initial}-${i}`}>{initial}</span>
            ))}
          </div>

          {weeks.map((week) => (
            <div className="year-heatmap__week" key={week.mondayKey}>
              {week.cells.map((cell) => (
                <span
                  key={cell.date}
                  className={`year-heatmap__cell${cell.status === 'future' ? ' year-heatmap__cell--future' : ''}`}
                  style={cell.status === 'future' ? undefined : { background: BAND_COLOR[cell.status === 'done' ? 'top' : cell.status === 'missed' ? 'low' : 'none'] }}
                  title={`${formatShortDate(cell.date)} — ${STATUS_LABEL[cell.status]}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="legend">
        <span className="legend__item">
          <span className="legend__swatch" style={{ background: BAND_COLOR.top }} />
          Cumplido
        </span>
        <span className="legend__item">
          <span className="legend__swatch" style={{ background: BAND_COLOR.low }} />
          No cumplido
        </span>
        <span className="legend__item">
          <span className="legend__swatch" style={{ background: BAND_COLOR.none }} />
          Sin registro
        </span>
      </div>
    </div>
  )
}
