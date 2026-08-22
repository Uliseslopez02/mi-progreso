import { startOfWeek, weekDays, weekdayInitials, type DateKey } from '../../domain/date'
import { goalCompletionOn } from '../../domain/consistency'
import { CheckIcon } from '../../components/icons'
import type { DayRecord } from '../../domain/types'
import { DEMO_HABITS, TODAY } from '../demoData'
import { ModuleFrame } from '../ModuleFrame'
import { useShowcase } from '../ShowcaseState'

/** Módulo 1 — grilla semanal de hábitos, igual espíritu que la página real de Hábitos. */
export function HabitsModule() {
  const { days, toggleGoal } = useShowcase()
  const week = weekDays(startOfWeek(TODAY))

  return (
    <ModuleFrame eyebrow="Hábitos" title="Cumplí y mirá crecer la racha" className="sc-module--habits" hint="Tocá el día de hoy">
      <div className="sc-habit-table">
        <div className="sc-habit-table__row sc-habit-table__row--head">
          <span className="sc-habit-table__name" aria-hidden="true" />
          {week.map((date, i) => (
            <span key={date} className={`sc-habit-table__dow${date === TODAY ? ' sc-habit-table__dow--today' : ''}`}>
              {weekdayInitials[i]}
            </span>
          ))}
        </div>

        {DEMO_HABITS.map((habit) => (
          <div className="sc-habit-table__row" key={habit.id}>
            <span className="sc-habit-table__name">{habit.name}</span>
            {week.map((date) => (
              <HabitCell key={date} date={date} habitId={habit.id} record={days[date]} onToggle={toggleGoal} />
            ))}
          </div>
        ))}
      </div>
    </ModuleFrame>
  )
}

function HabitCell({
  date,
  habitId,
  record,
  onToggle,
}: {
  date: DateKey
  habitId: string
  record: DayRecord | undefined
  onToggle: (goalId: string) => void
}) {
  const isFuture = date > TODAY
  const isToday = date === TODAY
  const done = goalCompletionOn(record, habitId)

  if (isFuture) {
    return <span className="sc-habit-cell sc-habit-cell--future" aria-hidden="true" />
  }

  if (!isToday) {
    return (
      <span
        className={`sc-habit-cell${done ? ' sc-habit-cell--done' : ''}`}
        aria-label={done ? 'Cumplido' : 'No cumplido'}
      >
        {done && <CheckIcon size={11} />}
      </span>
    )
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!done}
      aria-label={`Marcar hoy: ${habitId}`}
      className={`sc-habit-cell sc-habit-cell--interactive${done ? ' sc-habit-cell--done' : ''}`}
      onClick={() => onToggle(habitId)}
    >
      {done && <CheckIcon size={11} />}
    </button>
  )
}
