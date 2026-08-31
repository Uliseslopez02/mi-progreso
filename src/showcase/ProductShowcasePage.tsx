import '../styles/showcase.css'
import { HabitsModule } from './modules/HabitsModule'
import { TodayRitualModule } from './modules/TodayRitualModule'
import { GoalModule } from './modules/GoalModule'
import { StatsModule } from './modules/StatsModule'
import { MomentoMoriModule } from './modules/MomentoMoriModule'
import { FocusModule } from './modules/FocusModule'
import { DreamsModule } from './modules/DreamsModule'
import { OverallProgressModule } from './modules/OverallProgressModule'
import { ShowcaseProvider } from './ShowcaseState'

/**
 * Página pública `/producto`: demostración interactiva del producto, pensada
 * también como pieza comercial. No requiere cuenta — ver `main.tsx` para el
 * mount condicional por pathname.
 */
export function ProductShowcasePage() {
  return (
    <ShowcaseProvider>
      <div className="showcase">
        <a className="sc-back" href="/">
          ← Volver a Mi Progreso
        </a>

        <header className="sc-hero">
          <div className="sc-hero__glow sc-hero__glow--a" aria-hidden="true" />
          <div className="sc-hero__glow sc-hero__glow--b" aria-hidden="true" />
          <p className="hero__eyebrow">Mi Progreso</p>
          <h1 className="sc-hero__title">Un sistema para construir la vida que querés.</h1>
          <p className="sc-hero__subtitle">
            Hábitos, objetivos, enfoque y reflexión — conectados en un mismo progreso. Esto no es
            una demo grabada: es Mi Progreso funcionando de verdad. Tocá, marcá, mirá cómo
            reacciona.
          </p>
        </header>

        <main className="sc-grid">
          <OverallProgressModule />
          <HabitsModule />
          <TodayRitualModule />
          <GoalModule />
          <StatsModule />
          <DreamsModule />
          <FocusModule />
          <MomentoMoriModule />
        </main>

        <section className="sc-cta">
          <h2 className="sc-cta__title">Todo empieza con una pequeña acción.</h2>
          <p className="sc-cta__text">
            Creá tu cuenta y empezá a construir tu propio sistema — hoy mismo, con tus propios
            objetivos.
          </p>
          <div className="sc-cta__actions">
            <a className="btn btn--primary" href="/?signup=1">
              Empezar mi progreso
            </a>
            <a className="sc-btn-glass" href="/">
              Ya tengo cuenta
            </a>
          </div>
        </section>
      </div>
    </ShowcaseProvider>
  )
}
