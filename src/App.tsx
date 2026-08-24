import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from './auth/supabaseAuth'
import { ErrorScreen } from './components/ErrorScreen'
import { LoadingScreen } from './components/LoadingScreen'
import { SectionLayout } from './components/SectionLayout'
import { formatLongDate } from './domain/date'
import { CalendarPage } from './pages/CalendarPage'
import { FocusPage } from './pages/FocusPage'
import { GoalsPage } from './pages/GoalsPage'
import { HabitsPage } from './pages/HabitsPage'
import { HistoryPage } from './pages/HistoryPage'
import { InformesPage } from './pages/InformesPage'
import { LifeWheelPage } from './pages/LifeWheelPage'
import { PlannerPage } from './pages/PlannerPage'
import { RoutinesPage } from './pages/RoutinesPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodayPage } from './pages/TodayPage'
import { FirstTimeIntro } from './onboarding/FirstTimeIntro'
import { OnboardingWizard } from './onboarding/OnboardingWizard'
import { useAppContext } from './state/context'

const TABS = [
  { label: 'Hoy', path: '/' },
  { label: 'Agenda', path: '/agenda' },
  { label: 'Objetivos', path: '/objetivos' },
  { label: 'Historial', path: '/historial' },
  { label: 'Informes', path: '/informes' },
  { label: 'Ajustes', path: '/ajustes' },
]

const AGENDA_ITEMS = [
  { to: '/agenda', label: 'Planificador' },
  { to: '/agenda/enfoque', label: 'Enfoque' },
]

const OBJETIVOS_ITEMS = [
  { to: '/objetivos', label: 'Hábitos' },
  { to: '/objetivos/metas', label: 'Metas' },
  { to: '/objetivos/rutinas', label: 'Rutinas' },
  { to: '/objetivos/rueda-de-la-vida', label: 'Rueda de la vida' },
]

const HISTORIAL_ITEMS = [
  { to: '/historial', label: 'Resumen' },
  { to: '/historial/calendario', label: 'Calendario' },
]

/** true si `pathname` es exactamente `base` o una sub-ruta de `base` ('/' sólo matchea la raíz). */
function isWithin(pathname: string, base: string): boolean {
  if (base === '/') return pathname === '/'
  return pathname === base || pathname.startsWith(`${base}/`)
}

/** true = necesita el wizard, false = ya tiene datos propios, null = todavía no se decidió. */
type OnboardingFlag = boolean | null

export function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const { state, retryHydrate, saveStatus } = useAppContext()
  const [onboarding, setOnboarding] = useState<OnboardingFlag>(null)
  const [introSeen, setIntroSeen] = useState(false)
  const appName = state.data?.settings.appName ?? 'Mi Progreso'
  const location = useLocation()
  const navigate = useNavigate()

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
        message={state.error ?? 'No pudimos preparar tu progreso. Probá de nuevo en un momento.'}
        onRetry={retryHydrate}
        onSignOut={() => void signOut()}
      />
    )
  }

  if (state.status !== 'ready' || !state.data) {
    return <LoadingScreen message="Recuperando tus avances…" onRetry={retryHydrate} />
  }

  if (onboarding) {
    if (!introSeen) {
      return (
        <FirstTimeIntro
          onContinue={() => setIntroSeen(true)}
          onSkip={() => {
            setIntroSeen(true)
            setOnboarding(false)
          }}
        />
      )
    }
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
                key={item.path}
                type="button"
                className={`nav__item${isWithin(location.pathname, item.path) ? ' nav__item--active' : ''}`}
                aria-current={isWithin(location.pathname, item.path) ? 'page' : undefined}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <div className="container">
          <Routes>
            <Route path="/" element={<TodayPage onNavigate={navigate} />} />
            <Route path="/agenda" element={<SectionLayout items={AGENDA_ITEMS} ariaLabel="Agenda" />}>
              <Route index element={<PlannerPage />} />
              <Route path="enfoque" element={<FocusPage />} />
            </Route>
            <Route path="/objetivos" element={<SectionLayout items={OBJETIVOS_ITEMS} ariaLabel="Objetivos" />}>
              <Route index element={<HabitsPage />} />
              <Route path="metas" element={<GoalsPage />} />
              <Route path="rutinas" element={<RoutinesPage />} />
              <Route path="rueda-de-la-vida" element={<LifeWheelPage />} />
            </Route>
            <Route path="/historial" element={<SectionLayout items={HISTORIAL_ITEMS} ariaLabel="Historial" />}>
              <Route index element={<HistoryPage />} />
              <Route path="calendario" element={<CalendarPage />} />
            </Route>
            <Route path="/informes" element={<InformesPage />} />
            <Route path="/ajustes" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
