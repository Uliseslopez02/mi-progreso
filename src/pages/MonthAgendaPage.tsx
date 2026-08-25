import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonthAgenda } from '../components/MonthAgenda'
import { addMonths, startOfMonth, type DateKey } from '../domain/date'
import { useAppData } from '../state/context'

export function MonthAgendaPage() {
  const { data, today } = useAppData()
  const navigate = useNavigate()
  const [monthKey, setMonthKey] = useState<DateKey>(() => startOfMonth(today))

  const itemsByDay = useMemo(() => {
    const map: Record<DateKey, typeof data.plannerItems> = {}
    for (const item of data.plannerItems) {
      ;(map[item.date] ??= []).push(item)
    }
    return map
  }, [data.plannerItems])

  return (
    <div className="stack">
      <section className="card">
        <MonthAgenda
          monthKey={monthKey}
          today={today}
          itemsByDay={itemsByDay}
          onSelect={(date) => navigate(`/agenda?date=${date}`)}
          onMonthChange={(delta) => setMonthKey((current) => addMonths(current, delta))}
        />
      </section>
    </div>
  )
}
