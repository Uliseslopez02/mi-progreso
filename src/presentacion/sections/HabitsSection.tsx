import { HabitCard } from '../../components/HabitCard'
import { GoalList } from '../../components/GoalList'
import { SectionFrame } from '../SectionFrame'
import { DEMO_CATEGORIES, TODAY } from '../demoData'
import { usePresentacion } from '../PresentacionState'

/**
 * Recreación de la pantalla "Hábitos" (Objetivos → Hábitos): la misma
 * `<HabitCard>` de la app — racha actual 🔥, mejor racha, % de los últimos 30
 * días y el heatmap de esos 30 días. El lápiz abre el `<EditHabitModal>` real.
 * Los hábitos NO puntúan el día: se miden por racha y constancia propias.
 */
export function HabitsSection() {
  const { goals, days, toggleGoal, setGoalProgress, updateGoal, removeGoal } = usePresentacion()
  const habits = goals.filter((g) => g.trackingKind === 'habit')
  const record = days[TODAY]
  const todayHabits = (record?.goals ?? []).filter((g) => g.trackingKind === 'habit')
  const categoryName = (id: string) => DEMO_CATEGORIES.find((c) => c.id === id)?.name ?? 'Sin categoría'

  return (
    <SectionFrame
      eyebrow="Hábitos"
      title="Los hábitos no puntúan tu día — construyen tu racha."
      subtitle="Separados de los objetivos a propósito: un hábito se mide por constancia (días cumplidos sobre días vigentes) y por su propia racha, no por si hoy sumó puntos."
      className="pr-habits"
    >
      <div className="pr-habits__stack">
        <section className="card">
          <div className="card__header">
            <h3 className="card__title">Hábitos de hoy</h3>
          </div>
          <GoalList
            goals={todayHabits}
            goalProgress={record?.goalProgress ?? {}}
            onToggle={toggleGoal}
            onProgressChange={setGoalProgress}
            emptyMessage="Todavía no tenés hábitos para hoy."
          />
        </section>

        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            categoryName={categoryName(habit.categoryId)}
            categories={DEMO_CATEGORIES}
            days={days}
            today={TODAY}
            onUpdate={(patch) => updateGoal(habit.id, patch)}
            onRemove={() => removeGoal(habit.id)}
          />
        ))}
      </div>

      <p className="pr-habits__note">
        Cada hábito también tiene un mapa anual estilo heatmap de las últimas 53 semanas (Historial →
        Mapa anual) y puede pedir una lectura de IA bajo demanda que resume rachas y patrones por día
        de la semana — nunca se envía tu historial completo, sólo estadísticas agregadas.
      </p>
    </SectionFrame>
  )
}
