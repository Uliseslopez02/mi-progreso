import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { consumeEntryIntent } from './auth/entryIntent'
import { signOut } from './auth/supabaseAuth'
import { ErrorScreen } from './components/ErrorScreen'
import { LoadingScreen } from './components/LoadingScreen'
import { SectionLayout } from './components/SectionLayout'
import { formatLongDate } from './domain/date'
import { LogoMark } from './components/Logo'
import { NAV_TABS, orderTabs } from './domain/navigation'
import { CalendarPage } from './pages/CalendarPage'
import { DayAgendaPage } from './pages/DayAgendaPage'
import { EditGoalsPage } from './pages/EditGoalsPage'
import { EisenhowerPage } from './pages/EisenhowerPage'
import { FocusPage } from './pages/FocusPage'
import { GoalsPage } from './pages/GoalsPage'
import { HabitsPage } from './pages/HabitsPage'
import { HabitYearMapPage } from './pages/HabitYearMapPage'
import { HistoryPage } from './pages/HistoryPage'
import { InformesPage } from './pages/InformesPage'
import { MonthAgendaPage } from './pages/MonthAgendaPage'
import { MonthlyReviewPage } from './pages/MonthlyReviewPage'
import { NotesPage } from './pages/NotesPage'
import { PlannerPage } from './pages/PlannerPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { RoutinesPage } from './pages/RoutinesPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodayPage } from './pages/TodayPage'
import { FirstTimeIntro } from './onboarding/FirstTimeIntro'
import { OnboardingWizard } from './onboarding/OnboardingWizard'
import { hasOnboarded, markOnboarded } from './onboarding/onboardingStatus'
import { useAppContext } from './state/context'

const AGENDA_ITEMS = [
  { to: '/agenda', label: 'Día' },
  { to: '/agenda/semana', label: 'Planificador' },
  { to: '/agenda/mes', label: 'Mes' },
  { to: '/agenda/enfoque', label: 'Enfoque' },
  { to: '/agenda/matriz', label: 'Matriz' },
]

const OBJETIVOS_ITEMS = [
  { to: '/objetivos', label: 'Hábitos' },
  { to: '/objetivos/metas', label: 'Metas' },
  { to: '/objetivos/rutinas', label: 'Rutinas' },
  { to: '/objetivos/editar', label: 'Editar' },
]

const HISTORIAL_ITEMS = [
  { to: '/historial', label: 'Resumen' },
  { to: '/historial/calendario', label: 'Calendario' },
  { to: '/historial/mapa-anual', label: 'Mapa anual' },
  { to: '/historial/notas', label: 'Notas' },
]

const INFORMES_ITEMS = [
  { to: '/informes', label: 'Resumen' },
  { to: '/informes/revision', label: 'Revisión mensual' },
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
  const { state, retryHydrate, saveStatus, repository } = useAppContext()
  // Se lee y consume una sola vez (localStorage, ver entryIntent.ts): qué tan
  // directo entrar eligió la persona en la pantalla final del registro.
  const [entryIntent] = useState(() => consumeEntryIntent())
  const [onboarding, setOnboarding] = useState<OnboardingFlag>(null)
  const [introSeen, setIntroSeen] = useState(() => entryIntent === 'createHabit')
  // true sólo si se recorrió FirstTimeIntro de verdad (no si se entró directo al
  // wizard, ni si se lo salteó) — decide si el wizard continúa el mismo camino de
  // progreso o arranca el suyo propio desde cero.
  const [introCompleted, setIntroCompleted] = useState(false)
  const appName = state.data?.settings.appName ?? 'Mi Progreso'
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = appName
  }, [appName])

  // Marca "ya pasó por onboarding" en este dispositivo (síncrono, sin
  // parpadeo — ver onboardingStatus.ts) y, en paralelo y sin bloquear nada,
  // persiste lo mismo en el perfil server-side para quien lo necesite después
  // (panel propio, IA, otro dispositivo). Un fallo de red acá nunca debe
  // afectar la UI: por eso no se espera ni se muestra su resultado.
  const finishOnboarding = () => {
    markOnboarded()
    repository.completeOnboarding().catch(() => {})
  }

  // Se decide una sola vez, no en cada render: si se recalculara reactivamente
  // desde `state.data`, el primer objetivo creado dentro del wizard sacaría al
  // usuario del wizard a mitad de camino (categories/goals dejarían de estar vacíos).
  const isEmpty = state.data ? state.data.categories.length === 0 && state.data.goals.length === 0 : false
  if (state.status === 'ready' && state.data && onboarding === null) {
    // `entryIntent === 'explore'` cubre la primera visita tras elegir "explorar
    // por mi cuenta" (esa key se consume una sola vez); `hasOnboarded()` cubre
    // todas las visitas siguientes, cuando `entryIntent` ya no está disponible.
    const skip = entryIntent === 'explore' || hasOnboarded()
    if (skip && entryIntent === 'explore') finishOnboarding()
    setOnboarding(skip ? false : isEmpty)
  }

  // Re-arma el wizard si los datos vuelven a quedar vacíos más adelante (p. ej.
  // "Borrar todos los datos" en Ajustes) — pero sólo ante una transición real de
  // "tenía datos" a "se vació", nunca si ya empezó vacío (cuenta nueva que
  // saltea el onboarding a propósito, desde FirstTimeIntro o desde el registro).
  // `null` = todavía no se observó ningún estado "ready": si se inicializara con
  // el `isEmpty` del primer render (que siempre es `false`, antes de que carguen
  // los datos) una cuenta nueva vacía parecería "transicionar" a vacía apenas
  // carga, re-armando el wizard aunque se haya elegido saltearlo a propósito.
  const wasEmptyRef = useRef<boolean | null>(null)
  useEffect(() => {
    if (state.status !== 'ready') return
    if (wasEmptyRef.current === false && isEmpty && onboarding === false) setOnboarding(true)
    wasEmptyRef.current = isEmpty
  }, [state.status, onboarding, isEmpty])

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
          onContinue={() => {
            setIntroCompleted(true)
            setIntroSeen(true)
          }}
          onSkip={() => {
            setIntroSeen(true)
            setOnboarding(false)
            finishOnboarding()
          }}
        />
      )
    }
    return (
      <OnboardingWizard
        onComplete={() => {
          setOnboarding(false)
          finishOnboarding()
        }}
        stepOffset={introCompleted ? 4 : 0}
      />
    )
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
            <div className="brand__row">
              <LogoMark size={26} />
              <h1 className="brand__name">{appName}</h1>
            </div>
            <p className="brand__date">{formatLongDate(state.today)}</p>
          </div>
          <nav className="nav" aria-label="Secciones">
            {orderTabs(NAV_TABS, state.data.settings.navOrder).map((item) => (
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
              <Route index element={<DayAgendaPage />} />
              <Route path="semana" element={<PlannerPage />} />
              <Route path="mes" element={<MonthAgendaPage />} />
              <Route path="enfoque" element={<FocusPage />} />
              <Route path="matriz" element={<EisenhowerPage />} />
            </Route>
            <Route path="/proyectos" element={<ProjectsPage />} />
            <Route path="/objetivos" element={<SectionLayout items={OBJETIVOS_ITEMS} ariaLabel="Objetivos" />}>
              <Route index element={<HabitsPage />} />
              <Route path="metas" element={<GoalsPage />} />
              <Route path="rutinas" element={<RoutinesPage />} />
              <Route path="editar" element={<EditGoalsPage />} />
            </Route>
            <Route path="/historial" element={<SectionLayout items={HISTORIAL_ITEMS} ariaLabel="Historial" />}>
              <Route index element={<HistoryPage />} />
              <Route path="calendario" element={<CalendarPage />} />
              <Route path="mapa-anual" element={<HabitYearMapPage />} />
              <Route path="notas" element={<NotesPage />} />
            </Route>
            <Route path="/informes" element={<SectionLayout items={INFORMES_ITEMS} ariaLabel="Informes" />}>
              <Route index element={<InformesPage />} />
              <Route path="revision" element={<MonthlyReviewPage />} />
            </Route>
            <Route path="/ajustes" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
