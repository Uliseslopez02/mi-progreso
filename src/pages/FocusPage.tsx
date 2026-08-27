import { useEffect, useMemo, useState } from 'react'
import { ProgressRing } from '../components/ProgressRing'
import { Stat } from '../components/Stat'
import { createId } from '../domain/id'
import {
  focusMinutesOn,
  formatDuration,
  nextPomodoroPhase,
  POMODORO_CYCLE_LENGTH,
  POMODORO_FOCUS_MINUTES,
  POMODORO_LONG_BREAK_MINUTES,
  remainingSeconds,
  sessionMinutes,
  sessionsOn,
} from '../domain/focus'
import type { FocusSession, FocusSessionStatus, FocusSessionType } from '../domain/types'
import { useAppContext, useAppData } from '../state/context'

/** Sesión en curso: vive sólo en este navegador, nunca en Supabase — se
 * persiste una sesión real (`FocusSession`) recién cuando termina. */
const ACTIVE_KEY = 'mi-progreso:focus-active'
const LIBRE_DURATION_PRESETS = [5, 15, 25, 45, 60]
const DEEP_WORK_DURATION_PRESETS = [50, 90]

/** No es dominio persistido — sólo decide qué setup mostrar y, en Pomodoro,
 * si una fase completada debe encadenar la siguiente sola. */
type FocusMode = 'libre' | 'pomodoro' | 'profundo'
const MODE_LABEL: Record<FocusMode, string> = { libre: 'Libre', pomodoro: 'Pomodoro', profundo: 'Trabajo profundo' }

interface ActiveSession {
  id: string
  startedAt: string
  plannedMinutes: number
  type: FocusSessionType
  linkedPlannerItemId?: string
  mode: FocusMode
  /** Sólo relevante en modo pomodoro: qué enfoque del ciclo de 4 es este (o fue el último). */
  pomodoroCount?: number
}

function readActive(): ActiveSession | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_KEY)
    return raw ? (JSON.parse(raw) as ActiveSession) : null
  } catch {
    return null
  }
}

function writeActive(session: ActiveSession | null) {
  try {
    if (session) window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(session))
    else window.localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // sin espacio o modo privado: la sesión no sobrevive a un reload, no rompe la app
  }
}

const TYPE_LABEL: Record<FocusSessionType, string> = { focus: '🎯 Enfoque', break: '☕ Descanso' }

/** Temporizador de enfoque: cuenta regresiva basada en timestamps (no en un
 * contador que se pierde al cambiar de pestaña), con historial propio. */
export function FocusPage() {
  const { data, today } = useAppData()
  const { repository } = useAppContext()

  const [active, setActive] = useState<ActiveSession | null>(() => readActive())
  const [now, setNow] = useState(() => new Date())
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [mode, setMode] = useState<FocusMode>('libre')
  const [type, setType] = useState<FocusSessionType>('focus')
  const [minutes, setMinutes] = useState(25)
  const [linkedId, setLinkedId] = useState('')

  const chooseMode = (next: FocusMode) => {
    setMode(next)
    if (next === 'profundo') setMinutes(50)
    else if (next === 'libre') setMinutes(25)
  }

  useEffect(() => {
    let cancelled = false
    repository.loadFocusSessions().then((list) => {
      if (!cancelled) setSessions(list)
    })
    return () => {
      cancelled = true
    }
  }, [repository])

  const finishSession = (session: ActiveSession, status: FocusSessionStatus) => {
    const finished: FocusSession = {
      id: session.id,
      startedAt: session.startedAt,
      completedAt: new Date().toISOString(),
      plannedMinutes: session.plannedMinutes,
      type: session.type,
      status,
      linkedPlannerItemId: session.linkedPlannerItemId,
    }
    setSessions((prev) => [finished, ...prev])
    void repository.saveFocusSession(finished)

    // En Pomodoro, sólo la finalización natural encadena la fase siguiente sola —
    // "Detener" siempre sale del ciclo, para no arrancar una cuenta regresiva sin que
    // la persona lo haya pedido.
    if (status === 'completed' && session.mode === 'pomodoro') {
      const next = nextPomodoroPhase(session.type, session.pomodoroCount ?? 1)
      const nextSession: ActiveSession = {
        id: createId('focus'),
        startedAt: new Date().toISOString(),
        plannedMinutes: next.minutes,
        type: next.type,
        linkedPlannerItemId: session.linkedPlannerItemId,
        mode: 'pomodoro',
        pomodoroCount: next.pomodoroCount,
      }
      writeActive(nextSession)
      setActive(nextSession)
      setNow(new Date())
      return
    }

    writeActive(null)
    setActive(null)
  }

  // Un solo timer hace las dos cosas: refresca "now" para el conteo visible y
  // chequea si ya se cumplió la duración planeada, con timestamps reales en
  // cada tick — no importa si la pestaña estuvo oculta entre medio.
  useEffect(() => {
    if (!active) return
    const tick = () => {
      setNow(new Date())
      if (remainingSeconds(active.startedAt, active.plannedMinutes, new Date()) <= 0) {
        finishSession(active, 'completed')
      }
    }
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const startSession = () => {
    const effectiveType: FocusSessionType = mode === 'libre' ? type : 'focus'
    const effectiveMinutes = mode === 'pomodoro' ? POMODORO_FOCUS_MINUTES : minutes
    const session: ActiveSession = {
      id: createId('focus'),
      startedAt: new Date().toISOString(),
      plannedMinutes: effectiveMinutes,
      type: effectiveType,
      linkedPlannerItemId: linkedId || undefined,
      mode,
      pomodoroCount: mode === 'pomodoro' ? 1 : undefined,
    }
    writeActive(session)
    setActive(session)
    setNow(new Date())
  }

  const activeLabel = (session: ActiveSession): string => {
    if (session.mode === 'pomodoro') {
      if (session.type === 'focus') {
        const n = ((session.pomodoroCount ?? 1) - 1) % POMODORO_CYCLE_LENGTH + 1
        return `🎯 Enfoque · Pomodoro ${n}/${POMODORO_CYCLE_LENGTH}`
      }
      return session.plannedMinutes === POMODORO_LONG_BREAK_MINUTES ? '☕ Descanso largo' : '☕ Descanso corto'
    }
    if (session.mode === 'profundo') return '🧠 Trabajo profundo'
    return TYPE_LABEL[session.type]
  }

  const pendingTasks = useMemo(
    () => data.plannerItems.filter((i) => i.date === today && !i.done),
    [data.plannerItems, today],
  )
  const taskName = useMemo(() => {
    const map = new Map(data.plannerItems.map((i) => [i.id, i.title]))
    return (id?: string) => (id ? map.get(id) : undefined)
  }, [data.plannerItems])

  const todayFocusMinutes = useMemo(() => focusMinutesOn(sessions, today, 'focus'), [sessions, today])
  const todaySessions = useMemo(() => sessionsOn(sessions, today), [sessions, today])

  const remaining = active ? remainingSeconds(active.startedAt, active.plannedMinutes, now) : 0
  const totalSeconds = active ? active.plannedMinutes * 60 : 0
  const elapsedPercent = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Enfoque</h2>
        </div>

        {active ? (
          <div className="focus-timer">
            <ProgressRing percent={elapsedPercent} label={formatDuration(remaining)} caption={activeLabel(active)} />
            {taskName(active.linkedPlannerItemId) && (
              <p className="card__hint" style={{ marginTop: 12 }}>
                Trabajando en: <strong>{taskName(active.linkedPlannerItemId)}</strong>
              </p>
            )}
            <button
              type="button"
              className="btn btn--danger"
              style={{ marginTop: 18 }}
              onClick={() => finishSession(active, 'stopped')}
            >
              Detener
            </button>
          </div>
        ) : (
          <div className="focus-setup">
            <div className="chip-list" style={{ marginBottom: 14 }}>
              {(Object.keys(MODE_LABEL) as FocusMode[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`btn btn--ghost${mode === key ? ' btn--primary' : ''}`}
                  onClick={() => chooseMode(key)}
                >
                  {MODE_LABEL[key]}
                </button>
              ))}
            </div>

            {mode === 'libre' && (
              <div className="chip-list" style={{ marginBottom: 14 }}>
                {(Object.keys(TYPE_LABEL) as FocusSessionType[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`btn btn--ghost${type === key ? ' btn--primary' : ''}`}
                    onClick={() => setType(key)}
                  >
                    {TYPE_LABEL[key]}
                  </button>
                ))}
              </div>
            )}

            {mode === 'pomodoro' ? (
              <p className="card__hint" style={{ marginBottom: 14 }}>
                25 min enfoque · 5 min descanso · descanso largo cada 4
              </p>
            ) : (
              <div className="chip-list" style={{ marginBottom: 14 }}>
                {(mode === 'profundo' ? DEEP_WORK_DURATION_PRESETS : LIBRE_DURATION_PRESETS).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`btn btn--ghost${minutes === m ? ' btn--primary' : ''}`}
                    onClick={() => setMinutes(m)}
                  >
                    {m} min
                  </button>
                ))}
                <input
                  className="input"
                  style={{ width: 90 }}
                  type="number"
                  min={1}
                  aria-label="Duración personalizada en minutos"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            )}

            {pendingTasks.length > 0 && (
              <div className="field" style={{ marginBottom: 18, maxWidth: 320 }}>
                <label className="field__label" htmlFor="focus-linked-task">
                  Vincular tarea (opcional)
                </label>
                <select
                  id="focus-linked-task"
                  className="select"
                  value={linkedId}
                  onChange={(e) => setLinkedId(e.target.value)}
                >
                  <option value="">Sin vincular</option>
                  {pendingTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button type="button" className="btn btn--primary" onClick={startSession}>
              Iniciar
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Hoy</h2>
        </div>
        <div className="stat-grid">
          <Stat label="Minutos de enfoque" value={todayFocusMinutes} />
          <Stat label="Sesiones" value={todaySessions.length} />
        </div>
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Historial reciente</h2>
        </div>
        {sessions.length === 0 ? (
          <p className="empty">Todavía no completaste ninguna sesión de enfoque.</p>
        ) : (
          <ul className="subgoal-list">
            {sessions.slice(0, 20).map((s) => (
              <li className="subgoal" key={s.id}>
                <span>
                  {TYPE_LABEL[s.type]} · {sessionMinutes(s)} min
                  {taskName(s.linkedPlannerItemId) ? ` · ${taskName(s.linkedPlannerItemId)}` : ''}
                </span>
                <span
                  className={`pill pill--status-${s.status === 'completed' ? 'completed' : 'abandoned'}`}
                  style={{ marginLeft: 'auto' }}
                >
                  {s.status === 'completed' ? 'Completada' : 'Detenida'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
