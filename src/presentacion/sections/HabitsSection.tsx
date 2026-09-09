import { CheckIcon } from '../../components/icons'
import { goalCompletionOn, goalStreaks } from '../../domain/consistency'
import { startOfWeek, weekDays, weekdayInitials } from '../../domain/date'
import type { DayRecord } from '../../domain/types'
import { SectionFrame } from '../SectionFrame'
import { DEMO_HABITS, TODAY } from '../demoData'
import { usePresentacion } from '../PresentacionState'

/** Grilla semanal de hábitos: no puntúan el día, se miden por racha y constancia propias. */
export function HabitsSection() {
  const { days, toggleGoal } = usePresentacion()
  const week = weekDays(startOfWeek(TODAY))

  return (
    <SectionFrame
      eyebrow="Hábitos"
      title="Los hábitos no puntúan tu día — construyen tu racha."
      subtitle="Separados de los objetivos a propósito: un hábito se mide por constancia (días cumplidos sobre días vigentes) y racha, no por si hoy sumó puntos."
      className="pr-habits"
    >
      <div className="pr-card pr-habits__table">
        <div className="pr-habit-row pr-habit-row--head">
          <span className="pr-habit-row__name" aria-hidden="true" />
          {week.map((date, i) => (
            <span key={date} className={`pr-habit-dow${date === TODAY ? ' pr-habit-dow--today' : ''}`}>
              {weekdayInitials[i]}
            </span>
          ))}
        </div>
        {DEMO_HABITS.map((habit) => {
          const streak = goalStreaks(days, habit.id, TODAY)
          return (
            <div className="pr-habit-row" key={habit.id}>
              <span className="pr-habit-row__name">
                {habit.name}
                {streak.current > 0 && <span className="pr-habit-row__streak numeric"> · {streak.current} días</span>}
              </span>
              {week.map((date) => (
                <HabitCell key={date} date={date} habitId={habit.id} record={days[date]} onToggle={toggleGoal} />
              ))}
            </div>
          )
        })}
      </div>
      <p className="pr-habits__note">
        Cada hábito también tiene un mapa anual estilo heatmap (fuera de esta demo) para ver el patrón de
        todo el año de un vistazo, y puede pedir una lectura de IA bajo demanda que resume rachas y
        patrones por día de la semana — nunca se envía tu historial completo, sólo estadísticas agregadas.
      </p>
    </SectionFrame>
  )
}

function HabitCell({
  date,
  habitId,
  record,
  onToggle,
}: {
  date: string
  habitId: string
  record: DayRecord | undefined
  onToggle: (goalId: string) => void
}) {
  const isFuture = date > TODAY
  const isToday = date === TODAY
  const done = goalCompletionOn(record, habitId)

  if (isFuture) return <span className="pr-habit-cell pr-habit-cell--future" aria-hidden="true" />

  if (!isToday) {
    return (
      <span className={`pr-habit-cell${done ? ' pr-habit-cell--done' : ''}`} aria-label={done ? 'Cumplido' : 'No cumplido'}>
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
      className={`pr-habit-cell pr-habit-cell--interactive${done ? ' pr-habit-cell--done' : ''}`}
      onClick={() => onToggle(habitId)}
    >
      {done && <CheckIcon size={11} />}
    </button>
  )
}
