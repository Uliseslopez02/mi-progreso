import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { getSession } from '../auth/supabaseAuth'
import { consumeFocusIntent } from '../auth/focusIntent'
import { ProgressPath } from '../components/ProgressPath'
import {
  LIFE_AREAS,
  RECOMMENDED_MAX_GOALS,
  WEIGHT_TIERS,
  WEIGHT_TIER_LABELS,
  WEIGHT_TIER_VALUES,
  suggestedGoalsFor,
  weightForTier,
} from '../domain/onboardingCatalog'
import type { WeightTier } from '../domain/onboardingCatalog'
import { createInitialData } from '../domain/defaults'
import { createId } from '../domain/id'
import { useAppData } from '../state/context'

interface Props {
  onComplete: () => void
}

type Step = 'areas' | 'goals' | 'weights' | 'finish'

interface GoalDraft {
  id: string
  name: string
  areaId: string
  tier: WeightTier
}

const STEP_NUMBER: Record<Step, number> = { areas: 1, goals: 2, weights: 3, finish: 4 }
const TOTAL_STEPS = 4

/** Wizard de primeros pasos para una cuenta nueva y vacía: nada se persiste hasta "Crear mis objetivos". */
export function OnboardingWizard({ onComplete }: Props) {
  const { data, dispatch } = useAppData()
  const [step, setStep] = useState<Step>('areas')
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<string>>(() => {
    const focusAreaId = consumeFocusIntent()
    return focusAreaId ? new Set([focusAreaId]) : new Set()
  })
  const [draftGoals, setDraftGoals] = useState<GoalDraft[]>([])
  const [customName, setCustomName] = useState('')
  const [firstName, setFirstName] = useState<string | null>(null)

  useEffect(() => {
    getSession()
      .then((session) => {
        const fullName = session?.user.user_metadata?.full_name as string | undefined
        if (fullName?.trim()) setFirstName(fullName.trim().split(' ')[0])
      })
      .catch(() => {})
  }, [])

  const selectedAreas = LIFE_AREAS.filter((area) => selectedAreaIds.has(area.id))
  const suggestions = suggestedGoalsFor([...selectedAreaIds])
  const selectedNames = new Set(draftGoals.map((g) => g.name.trim().toLowerCase()))

  const toggleArea = (areaId: string) => {
    setSelectedAreaIds((prev) => {
      const next = new Set(prev)
      if (next.has(areaId)) next.delete(areaId)
      else next.add(areaId)
      return next
    })
  }

  const toggleSuggestion = (name: string, areaId: string) => {
    const key = name.trim().toLowerCase()
    setDraftGoals((prev) => {
      if (prev.some((g) => g.name.trim().toLowerCase() === key)) {
        return prev.filter((g) => g.name.trim().toLowerCase() !== key)
      }
      return [...prev, { id: createId('goal'), name, areaId, tier: 'media' }]
    })
  }

  const addCustomGoal = () => {
    const name = customName.trim()
    if (!name) return
    const key = name.toLowerCase()
    if (selectedNames.has(key)) {
      setCustomName('')
      return
    }
    const areaId = selectedAreas[0]?.id ?? 'otros'
    setDraftGoals((prev) => [...prev, { id: createId('goal'), name, areaId, tier: 'media' }])
    setCustomName('')
  }

  const onCustomKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addCustomGoal()
    }
  }

  const removeDraftGoal = (id: string) => {
    setDraftGoals((prev) => prev.filter((g) => g.id !== id))
  }

  const setTier = (id: string, tier: WeightTier) => {
    setDraftGoals((prev) => prev.map((g) => (g.id === id ? { ...g, tier } : g)))
  }

  const createGoals = () => {
    const existingCategoryIds = new Set(data.categories.map((c) => c.id))
    let categoryOrder = data.categories.length
    for (const area of selectedAreas) {
      if (existingCategoryIds.has(area.id)) continue
      dispatch({
        type: 'addCategory',
        category: { id: area.id, name: area.label, order: categoryOrder },
      })
      categoryOrder += 1
    }

    const createdAt = new Date().toISOString()
    draftGoals.forEach((draft, index) => {
      dispatch({
        type: 'addGoal',
        goal: {
          id: draft.id,
          name: draft.name,
          categoryId: draft.areaId,
          weight: weightForTier(draft.tier),
          active: true,
          period: 'daily',
          order: data.goals.length + index,
          createdAt,
          kind: 'boolean',
        },
      })
    })

    setStep('finish')
  }

  const useExamples = () => {
    if (!window.confirm('Esto reemplaza el wizard por un set de objetivos de ejemplo. ¿Continuar?')) return
    dispatch({ type: 'replaceData', data: createInitialData(new Date().toISOString()) })
    onComplete()
  }

  const goalsByArea = new Map<string, GoalDraft[]>()
  for (const goal of draftGoals) {
    const list = goalsByArea.get(goal.areaId) ?? []
    list.push(goal)
    goalsByArea.set(goal.areaId, list)
  }

  return (
    <div className="onboarding-screen">
      <div className="card onboarding-card">
        <p className="hero__eyebrow">Mi Progreso</p>
        <ProgressPath steps={TOTAL_STEPS} activeIndex={STEP_NUMBER[step] - 1} size="sm" />

        {step === 'areas' && (
          <>
            {firstName && <p className="onboarding-greeting">¡Bienvenido, {firstName}! 👋</p>}
            <h1 className="card__title">¿Qué querés mejorar?</h1>
            <p className="card__hint">Elegí una o más áreas de tu vida en las que querés progresar.</p>
            <div className="onboarding-options">
              {LIFE_AREAS.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  className={`onboarding-option${selectedAreaIds.has(area.id) ? ' onboarding-option--selected' : ''}`}
                  aria-pressed={selectedAreaIds.has(area.id)}
                  onClick={() => toggleArea(area.id)}
                >
                  {area.label}
                </button>
              ))}
            </div>
            <div className="row" style={{ marginTop: 18, justifyContent: 'space-between' }}>
              <button type="button" className="btn btn--ghost" onClick={useExamples}>
                Prefiero empezar con objetivos de ejemplo
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={selectedAreaIds.size === 0}
                onClick={() => setStep('goals')}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 'goals' && (
          <>
            <h1 className="card__title">¿Qué querés lograr?</h1>
            <p className="card__hint">Elegí los objetivos que te gustaría empezar a trackear.</p>

            {suggestions.length > 0 && (
              <div className="onboarding-options">
                {suggestions.map((suggestion) => {
                  const selected = selectedNames.has(suggestion.name.trim().toLowerCase())
                  return (
                    <button
                      key={suggestion.name}
                      type="button"
                      className={`onboarding-option${selected ? ' onboarding-option--selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => toggleSuggestion(suggestion.name, suggestion.areaId)}
                    >
                      {suggestion.name}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="field" style={{ marginTop: 14, maxWidth: 360 }}>
              <label className="field__label" htmlFor="onboarding-custom-goal">
                Agregar un objetivo propio
              </label>
              <div className="row">
                <input
                  id="onboarding-custom-goal"
                  className="input"
                  placeholder="Ej. Meditar 10 minutos"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={onCustomKeyDown}
                />
                <button type="button" className="btn" onClick={addCustomGoal}>
                  Agregar
                </button>
              </div>
            </div>

            {draftGoals.length > 0 && (
              <div className="chip-list" style={{ marginTop: 14 }}>
                {draftGoals.map((goal) => (
                  <span className="category-chip" key={goal.id}>
                    {goal.name}
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Quitar ${goal.name}`}
                      onClick={() => removeDraftGoal(goal.id)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {draftGoals.length > RECOMMENDED_MAX_GOALS && (
              <p className="onboarding-warning" role="status">
                Elegiste bastantes objetivos para arrancar — con {RECOMMENDED_MAX_GOALS} suele ser más
                fácil sostenerlos. Podés agregar el resto más adelante desde Ajustes.
              </p>
            )}

            <div className="row" style={{ marginTop: 18, justifyContent: 'space-between' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setStep('areas')}>
                Atrás
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={draftGoals.length === 0}
                onClick={() => setStep('weights')}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 'weights' && (
          <>
            <h1 className="card__title">¿Qué tan importante es cada objetivo?</h1>
            <p className="card__hint">
              Los objetivos con más importancia pesan más en tu progreso del día.
            </p>

            <div className="goal-list">
              {draftGoals.map((goal) => (
                <div key={goal.id} className="onboarding-weight-row">
                  <span className="goal__name">{goal.name}</span>
                  <div className="onboarding-tier-group" role="group" aria-label={`Importancia de ${goal.name}`}>
                    {WEIGHT_TIERS.map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        className={`onboarding-tier${goal.tier === tier ? ' onboarding-tier--selected' : ''}`}
                        aria-pressed={goal.tier === tier}
                        onClick={() => setTier(goal.id, tier)}
                      >
                        {WEIGHT_TIER_LABELS[tier]}
                        <span className="goal__weight">×{WEIGHT_TIER_VALUES[tier]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="row" style={{ marginTop: 18, justifyContent: 'space-between' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setStep('goals')}>
                Atrás
              </button>
              <button type="button" className="btn btn--primary" onClick={createGoals}>
                Crear mis objetivos
              </button>
            </div>
          </>
        )}

        {step === 'finish' && (
          <>
            <h1 className="card__title">Ya está. Mañana empiezo.</h1>
            <p className="card__hint">Estos son los objetivos que armaste:</p>

            <div className="stack" style={{ gap: 14, marginTop: 6 }}>
              {selectedAreas.map((area) => {
                const goals = goalsByArea.get(area.id)
                if (!goals || goals.length === 0) return null
                return (
                  <div key={area.id}>
                    <p className="section-title">{area.label}</p>
                    <div className="chip-list" style={{ marginTop: 8 }}>
                      {goals.map((goal) => (
                        <span className="category-chip" key={goal.id}>
                          {goal.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn--primary" onClick={onComplete}>
                Entrar a Mi Progreso
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
