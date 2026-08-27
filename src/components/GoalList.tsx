import type { GoalSnapshot } from '../domain/types'

interface Props {
  goals: GoalSnapshot[]
  goalProgress: Record<string, number | boolean>
  onToggle: (goalId: string) => void
  onProgressChange?: (goalId: string, value: number) => void
  disabled?: boolean
  /** Estado vacío por defecto: "No hay objetivos activos. Agregá los tuyos en Ajustes." */
  emptyMessage?: string
  /** Si se pasa, reemplaza el texto de estado vacío por un botón de creación directa. */
  emptyAction?: { label: string; onClick: () => void }
}

interface Group {
  categoryId: string
  categoryName: string
  goals: GoalSnapshot[]
}

function groupByCategory(goals: GoalSnapshot[]): Group[] {
  const groups: Group[] = []
  for (const goal of goals) {
    let group = groups.find((g) => g.categoryId === goal.categoryId)
    if (!group) {
      group = { categoryId: goal.categoryId, categoryName: goal.categoryName, goals: [] }
      groups.push(group)
    }
    group.goals.push(goal)
  }
  return groups
}

/** Lista de objetivos agrupada por categoría. Un click = un objetivo marcado. */
export function GoalList({
  goals,
  goalProgress,
  onToggle,
  onProgressChange,
  disabled = false,
  emptyMessage = 'No hay objetivos activos. Agregá los tuyos en Ajustes.',
  emptyAction,
}: Props) {
  if (goals.length === 0) {
    if (emptyAction) {
      return (
        <div className="empty-state">
          <p className="empty">{emptyMessage}</p>
          <button type="button" className="btn btn--primary" onClick={emptyAction.onClick}>
            {emptyAction.label}
          </button>
        </div>
      )
    }
    return <p className="empty">{emptyMessage}</p>
  }

  const getIsDone = (goal: GoalSnapshot): boolean => {
    const progress = goalProgress[goal.goalId] ?? 0
    if (goal.kind === 'boolean') return !!progress
    if (goal.targetValue) return (progress as number) >= goal.targetValue
    return !!progress
  }

  return (
    <div>
      {groupByCategory(goals).map((group) => {
        const done = group.goals.filter(getIsDone).length
        return (
          <section className="goal-group" key={group.categoryId}>
            <h3 className="goal-group__title">
              <span>{group.categoryName}</span>
              <span className="numeric">
                {done}/{group.goals.length}
              </span>
            </h3>
            <div className="goal-list">
              {group.goals.map((goal) => {
                const isDone = getIsDone(goal)
                const progress = goalProgress[goal.goalId] ?? 0

                if (goal.kind === 'boolean') {
                  return (
                    <button
                      key={goal.goalId}
                      type="button"
                      role="checkbox"
                      aria-checked={isDone}
                      disabled={disabled}
                      className={`goal${isDone ? ' goal--done' : ''}`}
                      onClick={() => onToggle(goal.goalId)}
                    >
                      <span className="goal__box" aria-hidden="true">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M1.5 6.4 4.4 9.3 10.5 3"
                            stroke="#06281c"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span className="goal__name">{goal.name}</span>
                      {goal.weight !== 1 && <span className="goal__weight">×{goal.weight}</span>}
                    </button>
                  )
                }

                // Cuantitativo/temporal: mostrar input numérico
                return (
                  <div key={goal.goalId} className="goal">
                    <input
                      type="number"
                      min="0"
                      max={goal.targetValue}
                      value={progress as number}
                      disabled={disabled}
                      aria-label={goal.name}
                      onChange={(e) => onProgressChange?.(goal.goalId, +e.target.value)}
                      className="goal__input"
                    />
                    <span className="goal__name">
                      {goal.name} {goal.unit && `(${progress}/${goal.targetValue} ${goal.unit})`}
                    </span>
                    {goal.weight !== 1 && <span className="goal__weight">×{goal.weight}</span>}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
