import { useEffect, useState } from 'react'
import { ErrorScreen } from './components/ErrorScreen'
import { LoadingScreen } from './components/LoadingScreen'
import { formatLongDate } from './domain/date'
import { CalendarPage } from './pages/CalendarPage'
import { FocusPage } from './pages/FocusPage'
import { GoalsPage } from './pages/GoalsPage'
import { HabitsPage } from './pages/HabitsPage'
import { HistoryPage } from './pages/HistoryPage'
import { LifeWheelPage } from './pages/LifeWheelPage'
import { MomentoMoriPage } from './pages/MomentoMoriPage'
import { PlannerPage } from './pages/PlannerPage'
import { RoutinesPage } from './pages/RoutinesPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodayPage } from './pages/TodayPage'
import { OnboardingWizard } from './onboarding/OnboardingWizard'
import { useAppContext } from './state/context'

export type Tab =
  | 'hoy'
  | 'habitos'
  | 'metas'
  | 'planificador'
  | 'rutinas'
  | 'enfoque'
  | 'rueda'
  | 'momento-mori'
  | 'historial'
  | 'calendario'
  | 'ajustes'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'habitos', label: 'Hábitos' },
  { id: 'metas', label: 'Metas' },
  { id: 'planificador', label: 'Planificador' },
  { id: 'rutinas', label: 'Rutinas' },
  { id: 'enfoque', label: 'Enfoque' },
  { id: 'rueda', label: 'Rueda de la vida' },
  { id: 'momento-mori', label: 'Momento Mori' },
  { id: 'historial', label: 'Historial' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'ajustes', label: 'Ajustes' },
]

/** true = necesita el wizard, false = ya tiene datos propios, null = todavía no se decidió. */
type OnboardingFlag = boolean | null

export function App() {
  const { state, retryHydrate, saveStatus } = useAppContext()
  const [tab, setTab] = useState<Tab>('hoy')
  const [onboarding, setOnboarding] = useState<OnboardingFlag>(null)
  const appName = state.data?.settings.appName ?? 'Mi Progreso'

  useEffect(() => {
    document.title = appName
  }, [appName])

  // Se decide una sola vez, no en cada render: si se recalculara reactivamente
  // desde `state.data`, el primer objetivo creado dentro del wizard sacaría al
  // usuario del wizard a mitad de camino (categories/goals dejarían de estar vacíos).
  const isEmpty = state.data ? state.data.categories.length === 0 && state.data.goals.length === 0 : false
  if (state.status === 'ready' && state.data && onboarding === null) {
    setOnboarding(isEmpty)
  }

  // Re-arma el wizard si los datos vuelven a quedar vacíos más adelante
  // (p. ej. "Borrar todos los datos" en Ajustes).
  useEffect(() => {
    if (onboarding === false && isEmpty) setOnboarding(true)
  }, [onboarding, isEmpty])

  if (state.status === 'error') {
    return (
      <ErrorScreen
        message={state.error ?? 'No pudimos cargar tus datos. Probá de nuevo en un momento.'}
        onRetry={retryHydrate}
      />
    )
  }

  if (state.status !== 'ready' || !state.data) {
    return <LoadingScreen message="Cargando tus datos…" onRetry={retryHydrate} />
  }

  if (onboarding) {
    return <OnboardingWizard onComplete={() => setOnboarding(false)} />
  }

  return (
    <div className="app-shell">
      {saveStatus === 'error' && (
        <div className="save-banner" role="status">
          No pudimos guardar tus últimos cambios. Reintentando…
        </div>
      )}
      <header className="app-header">
        <div className="container app-header__row">
          <div className="brand">
            <h1 className="brand__name">{appName}</h1>
            <p className="brand__date">{formatLongDate(state.today)}</p>
          </div>
          <nav className="nav" aria-label="Secciones">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav__item${tab === item.id ? ' nav__item--active' : ''}`}
                aria-current={tab === item.id ? 'page' : undefined}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <div className="container">
          {tab === 'hoy' && <TodayPage onNavigate={setTab} />}
          {tab === 'habitos' && <HabitsPage />}
          {tab === 'metas' && <GoalsPage />}
          {tab === 'planificador' && <PlannerPage />}
          {tab === 'rutinas' && <RoutinesPage />}
          {tab === 'enfoque' && <FocusPage />}
          {tab === 'rueda' && <LifeWheelPage />}
          {tab === 'momento-mori' && <MomentoMoriPage />}
          {tab === 'historial' && <HistoryPage />}
          {tab === 'calendario' && <CalendarPage />}
          {tab === 'ajustes' && <SettingsPage />}
        </div>
      </main>
    </div>
  )
}
